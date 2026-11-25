# Runbook — Application des migrations Phase 2 en Production

- **Version :** 1.2 — 25 novembre 2026
- **Opérateur :** propriétaire du projet, seul habilité à exécuter les opérations distantes.
- **Objet :** application contrôlée du lot figé de trois migrations devis/factures.
- **Périmètre :** schéma et fonctions uniquement ; aucune activation de module.
- **Références :** `supabase/phase2-migrations/README.md`, `docs/ROADMAP.md` §4.1, ACC-07, PR #138.

> **Autorisation distincte obligatoire.** L'approbation de ce runbook autorise sa préparation documentaire, pas l'exécution de `db push`. Toute application sur DEV ou Production exige une autorisation explicite, datée, accordée séparément par le propriétaire après revue du dry-run correspondant.

## Historique de cette révision

La version 1.2 consolide les protections de la version 1.1 et ajoute les précautions suivantes :

- isolation du lot depuis le commit exact `2196ddbd0c5f901247c1c201fbf102122543cd8b`, dans un worktree propre et détaché ;
- séparation stricte du worktree documentaire et du worktree d'exécution ;
- séparation stricte du lot 1 et de la migration ultérieure de stabilité de devise `20261125095431_factures_devise_stable.sql` ;
- commandes Supabase CLI 3.0.0 avec cible distante explicite `--remote` ;
- contrôle obligatoire de la cible `Target:` et conservation des sorties standard et d'erreur ;
- interdiction de `--yes` et de `SUPABASE_YES`, avec contrôle du terminal interactif et des fichiers d'environnement ;
- rattrapage DEV et tests DEV avant la sauvegarde fraîche de Production ;
- sauvegarde réalisée depuis un répertoire protégé hors du dépôt, avec vérification des permissions et de l'empreinte SHA-256 ;
- restauration à blanc sur une base jetable locale, avec contrôle strict de l'hôte, du port et du nom de la base ;
- requêtes SQL en lecture seule pour vérifier la restauration ;
- retour arrière par migration corrective additive, et non par ré-exécution manuelle de SQL sur une base hébergée ;
- conservation des preuves hors du worktree d'exécution.

## 0. Règles non négociables

1. **Lot fermé :** seules les trois migrations du §1 peuvent être proposées par le dry-run. Toute quatrième migration, migration manquante, version inconnue ou ordre inattendu = **STOP**.

2. **Isolation du lot :** toutes les commandes de migration sont lancées depuis le worktree propre du commit de référence du §2.1, jamais depuis la branche de développement courante ni depuis le worktree documentaire.

3. **CLI verrouillée :** utiliser exclusivement `npx supabase@3.0.0` pendant cette opération. Consigner la version réellement retournée. Si la version affichée n'est pas `3.0.0`, **STOP**.

4. **Cible distante explicite :** avec Supabase CLI v3, les commandes de base de données ciblent le stack local par défaut. Toute commande visant un projet hébergé, notamment `migration list` et `db push`, doit inclure `--remote=<project-ref>` avec la référence exacte attendue. L'absence de `--remote` est interdite pour les relevés distants, dry-runs et applications.

   Exception : `supabase link --project-ref <ref>` établit la liaison locale du dépôt avec le projet. Cette commande ne remplace pas `--remote` pour les opérations de base de données.

5. **Confirmation interactive :** ne jamais utiliser `--yes`, ne jamais définir `SUPABASE_YES` dans le shell et ne jamais laisser cette variable définie dans les fichiers d'environnement du projet. Avant chaque application, vérifier que le CLI peut afficher son prompt interactif. La confirmation par défaut est `No`. L'opérateur ne confirme qu'après avoir vérifié la cible et la liste exacte.

   Ne jamais envoyer une réponse par un pipe, ne jamais utiliser un mode de sortie JSON/YAML/TOML/ENV pour l'application et ne jamais déléguer la commande d'application à un agent d'exécution. Le propriétaire exécute lui-même la commande depuis son terminal local interactif.

   Si le CLI ne peut pas demander une confirmation, s'il renvoie `HostedMutationConsentRequiredError`, ou si aucun prompt n'apparaît, **STOP**. Ne pas contourner cette protection.

   La variable `SUPABASE_YES` définie dans le shell peut servir à confirmer une opération sans prompt. Une définition dans un fichier de projet `.env` ne vaut pas consentement ; toutefois, certains fichiers `.env` qui définissent cette variable empêchent également le CLI de reconnaître une éventuelle variable exportée dans le shell. Par précaution, ce runbook interdit sa présence dans le shell et dans les fichiers d'environnement concernés.

6. `POLYGEST_INVOICES_ENABLED` reste `false` en Production ; `DOCUMENT_SCANNER_ENABLED` reste `false`. Ces valeurs sont constatées, jamais modifiées dans ce runbook.

7. Chaque étape est cochée, horodatée et consignée dans le PV (§8). Aucune étape n'est sautée.

8. Aucune modification manuelle du schéma ou des données sur une base hébergée. Toute modification passe par une migration versionnée, une PR, la CI et Supabase CLI. Les requêtes SQL strictement en lecture seule sont autorisées pour les contrôles post-déploiement.

9. Ne jamais lancer `db reset`, `migration repair`, `migration up`, `migration down`, `DROP`, `TRUNCATE`, ou une commande de restauration contre DEV ou Production pendant cette opération.

10. Un échec de `db push` ne signifie pas nécessairement qu'aucune migration n'a été appliquée : plusieurs migrations peuvent avoir été appliquées avant que l'une d'elles échoue. En cas d'échec, ne pas relancer la commande. Faire un relevé distant en lecture seule et traiter l'incident conformément au §7.

11. En cas de doute : **STOP**, conserver les sorties, consigner l'incident et faire examiner la divergence. Ne jamais improviser.

## 1. Lot figé — exactement trois migrations

**Commit de référence :** `2196ddbd0c5f901247c1c201fbf102122543cd8b`

**Référence Git :** merge commit de la PR #138 (`fix(invoices): guard accepted quote cancellation`).

| # | Version et fichier | Effet | État DEV déclaré avant opération | État Production déclaré avant opération |
|---|---|---|---|---|
| 1 | `20261116142111_invoice_quantity_finite_check.sql` | Ajoute la contrainte `invoice_lines_quantity_finite_check` utilisant `quantity < 'Infinity'::numeric`. Cette comparaison stricte écarte `Infinity` et `NaN`. Elle ne rejette pas, à elle seule, `-Infinity` : vérifier également la règle de positivité préexistante. | Appliquée et vérifiée le 19 novembre | À vérifier dans le relevé initial ; attendue absente |
| 2 | `20261116203000_devis_annulation_accepte.sql` | `cancel_quote` v2 : autorise l'annulation motivée des devis transmis et acceptés. | Appliquée et vérifiée le 19 novembre | À vérifier dans le relevé initial ; attendue absente |
| 3 | `20261120205904_guard_accepted_quote_cancellation.sql` | `cancel_quote` v3 : refuse l'annulation d'un devis accepté tant qu'un brouillon de facture lié est actif ; erreur SQLSTATE `55000`. | Non appliquée selon le suivi au moment de la préparation ; à confirmer par le relevé DEV | À vérifier dans le relevé initial ; attendue absente |

La PR #138 a ajouté la troisième migration et ses tests ; son descriptif précise qu'elle n'applique rien sur DEV ou Production. L'état effectif doit toutefois être confirmé par les relevés distants réalisés le jour de l'opération.

**Précision PostgreSQL :** pour le type `numeric`, PostgreSQL traite `NaN` comme supérieur aux autres valeurs numériques, y compris `Infinity`. La comparaison `quantity < 'Infinity'::numeric` rejette donc `NaN` et `Infinity`, mais pas `-Infinity`. La règle de positivité préexistante doit continuer à exclure les valeurs négatives. Ne pas interpréter la seule nouvelle contrainte comme une validation exhaustive de toutes les valeurs non finies.

Le lot ne crée aucune émission légale, aucun numéro légal, aucune taxe ni aucun règlement. Il rattrape le décalage du schéma Production par rapport au code déjà livré.

### Exclusion explicite — lot 2

La migration `20261125095431_factures_devise_stable.sql` et son test `apps/web/__tests__/db/invoices-devise-stable.test.ts` sont **hors lot 1**.

Ils ne doivent ni être copiés dans le worktree d'exécution, ni être cherry-pickés, ni être ajoutés à ce dry-run. Ils seront livrés dans un lot distinct, après PR et validation indépendantes.

## 2. Préconditions — toutes bloquantes

### Ordre opératoire

Respecter strictement l'ordre suivant :

1. geler le lot Git dans le worktree détaché ;
2. vérifier la CLI, les références et les protections interactives ;
3. rattraper DEV après autorisation séparée, puis réussir les scénarios fonctionnels DEV ;
4. réaliser une sauvegarde fraîche de Production ;
5. restaurer cette sauvegarde dans la base jetable locale et vérifier le résultat ;
6. réunir toutes les préconditions Production ;
7. relever l'état initial Production, réaliser le dry-run, puis demander l'autorisation distincte d'application.

Aucune étape Production ne commence avant la réussite des étapes DEV et de la restauration à blanc.

### 2.1 Gel Git et worktree indépendant

**Séparation explicite des worktrees.**

Le worktree documentaire `gestion-entreprise-universelle-runbook`, sur la branche `docs/runbook-production-phase2-v1.1`, sert uniquement à rédiger, relire et versionner ce runbook. Aucune commande `supabase db push`, aucune migration ni aucune opération distante ne doit y être exécutée.

Les vérifications et opérations du lot 1 doivent être effectuées exclusivement depuis le worktree d'exécution distinct `gestion-entreprise-universelle-prod-phase2-2196ddb`, détaché sur le commit exact indiqué ci-dessous. Le dépôt de travail actif et ses modifications non validées restent intacts.

Ne pas changer de branche dans le répertoire de travail actif : il contient des travaux en cours. Créer un worktree détaché à partir du commit de référence afin de ne pas toucher à ces travaux.

Depuis PowerShell, à la racine du dépôt de travail actif :

```powershell
$ExpectedCommit = '2196ddbd0c5f901247c1c201fbf102122543cd8b'
$Worktree = Join-Path (Split-Path (Get-Location).Path -Parent) 'gestion-entreprise-universelle-prod-phase2-2196ddb'

if (Test-Path -LiteralPath $Worktree) {
  throw "STOP : le chemin du worktree existe déjà. Ne pas le réutiliser sans inspection."
}

git fetch origin
if ($LASTEXITCODE -ne 0) {
  throw 'STOP : git fetch a échoué.'
}

git cat-file -e "$ExpectedCommit^{commit}"
if ($LASTEXITCODE -ne 0) {
  throw 'STOP : le commit de référence est introuvable.'
}

git worktree add --detach $Worktree $ExpectedCommit
if ($LASTEXITCODE -ne 0) {
  throw 'STOP : création du worktree impossible.'
}

$ActualCommit = (git -C $Worktree rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $ActualCommit -ne $ExpectedCommit) {
  throw 'STOP : le SHA du worktree ne correspond pas au commit figé.'
}

git -C $Worktree status --short --branch

$WorktreeStatus = @(git -C $Worktree status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0 -or $WorktreeStatus.Count -ne 0) {
  $WorktreeStatus
  throw 'STOP : le worktree d’exécution n’est pas propre.'
}

$RequiredMigrations = @(
  '20261116142111_invoice_quantity_finite_check.sql',
  '20261116203000_devis_annulation_accepte.sql',
  '20261120205904_guard_accepted_quote_cancellation.sql'
)

foreach ($Migration in $RequiredMigrations) {
  $MigrationPath = Join-Path $Worktree "supabase/migrations/$Migration"
  if (-not (Test-Path -LiteralPath $MigrationPath -PathType Leaf)) {
    throw "STOP : migration attendue absente : $Migration"
  }
}

$ExcludedMigration = Join-Path $Worktree 'supabase/migrations/20261125095431_factures_devise_stable.sql'
if (Test-Path -LiteralPath $ExcludedMigration) {
  throw 'STOP : la migration de stabilité de devise est présente dans le worktree figé.'
}

git -C $Worktree status --porcelain --untracked-files=all
```

Conditions de poursuite :

- `rev-parse HEAD` doit retourner exactement `2196ddbd0c5f901247c1c201fbf102122543cd8b` ;
- `git status --porcelain --untracked-files=all` doit être vide ;
- les trois fichiers du §1 doivent être présents ;
- `20261125095431_factures_devise_stable.sql` doit être absent de ce worktree ;
- aucun autre fichier de migration postérieur au commit ne doit y être ajouté.

Si une condition échoue : **STOP**. Ne pas nettoyer le répertoire initial, ne pas supprimer de stash et ne pas changer sa branche pour forcer le résultat.

### 2.2 Outillage, preuves et identification des projets

Depuis PowerShell, dans le worktree d'exécution :

```powershell
Set-Location $Worktree

$ProjectRoot = (Get-Location).Path

$EvidenceDirName = 'polygest-prod-phase2-cli-evidence-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff')
$EvidenceDir = Join-Path $env:USERPROFILE $EvidenceDirName

if (Test-Path -LiteralPath $EvidenceDir) {
  throw 'STOP : le dossier de preuves existe déjà. Ne pas le réutiliser.'
}

New-Item -ItemType Directory -Path $EvidenceDir | Out-Null
```

Le dossier de preuves est créé hors du dépôt, dans le profil Windows de l'opérateur. Un nouveau nom horodaté est généré pour chaque intervention. Ne jamais réutiliser un dossier de preuves préexistant.

Définir ensuite cette fonction PowerShell :

```powershell
function Assert-SupabaseInteractive {
  if ((Get-Location).Path -ne $ProjectRoot) {
    throw 'STOP : le répertoire courant n’est plus le worktree d’exécution.'
  }

  if (Test-Path Env:SUPABASE_YES) {
    throw 'STOP : SUPABASE_YES est défini dans le shell.'
  }

  if ([Console]::IsInputRedirected -or [Console]::IsOutputRedirected) {
    throw 'STOP : le terminal ne permet pas une confirmation interactive.'
  }

  $EffectiveSupabaseEnv = $env:SUPABASE_ENV

  if ([string]::IsNullOrWhiteSpace($EffectiveSupabaseEnv)) {
    $EffectiveSupabaseEnv = 'development'
  }

  if ($EffectiveSupabaseEnv -notmatch '^[A-Za-z0-9_-]+$') {
    throw 'STOP : valeur SUPABASE_ENV non conforme.'
  }

  $EnvNames = @(
    ".env.$EffectiveSupabaseEnv.local",
    '.env.local',
    ".env.$EffectiveSupabaseEnv",
    '.env'
  )

  if (-not [string]::IsNullOrWhiteSpace($env:NODE_ENV)) {
    if ($env:NODE_ENV -notmatch '^[A-Za-z0-9_-]+$') {
      throw 'STOP : valeur NODE_ENV non conforme.'
    }

    $EnvNames += ".env.$env:NODE_ENV"
    $EnvNames += ".env.$env:NODE_ENV.local"
  }

  $EnvNames = @($EnvNames | Select-Object -Unique)

  $EnvDirectories = @(
    (Join-Path $ProjectRoot 'supabase'),
    $ProjectRoot
  )

  $EnvMatches = @()

  foreach ($Directory in $EnvDirectories) {
    foreach ($Name in $EnvNames) {
      $Candidate = Join-Path $Directory $Name

      if (Test-Path -LiteralPath $Candidate -PathType Leaf) {
        $Found = Select-String `
          -LiteralPath $Candidate `
          -Pattern '^\s*(?:export\s+)?SUPABASE_YES(?:\s*=|\s*$)'

        if ($Found) {
          $EnvMatches += $Found
        }
      }
    }
  }

  if ($EnvMatches.Count -gt 0) {
    $EnvMatches | ForEach-Object {
      Write-Host "$($_.Path):$($_.LineNumber)"
    }

    throw 'STOP : SUPABASE_YES est défini dans un fichier d’environnement actif.'
  }
}
```

Définir également cette fonction de contrôle de cible :

```powershell
function Assert-SupabaseTargetOutput {
  param(
    [object[]]$CommandOutput,
    [string]$ExpectedRef,
    [string]$Stage
  )

  $TargetLines = @(
    $CommandOutput |
      ForEach-Object { $_.ToString() } |
      Where-Object { $_ -match 'Target:' }
  )

  if (
    $TargetLines.Count -ne 1 -or
    $TargetLines[0] -notmatch [regex]::Escape($ExpectedRef)
  ) {
    throw "STOP : ligne Target absente ou project ref incorrecte ($Stage)."
  }
}
```

La fonction `Assert-SupabaseInteractive` doit être conservée dans la session PowerShell. Elle vérifie avant les applications :

- que la session utilise toujours le worktree d'exécution ;
- que `SUPABASE_YES` n'est pas défini dans le shell ;
- que le terminal accepte la saisie et l'affichage interactifs ;
- que les fichiers d'environnement du projet susceptibles d'être lus par la CLI ne définissent pas `SUPABASE_YES`.

Si cette fonction échoue, **STOP**. Ne pas supprimer ou modifier automatiquement des variables d'environnement pour contourner le contrôle.

Vérifier la CLI et son aide :

```powershell
Assert-SupabaseInteractive

npx supabase@3.0.0 --version
if ($LASTEXITCODE -ne 0) {
  throw 'STOP : vérification de la version Supabase CLI impossible.'
}

npx supabase@3.0.0 login
if ($LASTEXITCODE -ne 0) {
  throw 'STOP : authentification Supabase CLI échouée.'
}

npx supabase@3.0.0 migration list --help
if ($LASTEXITCODE -ne 0) {
  throw 'STOP : aide migration list indisponible.'
}

npx supabase@3.0.0 db push --help
if ($LASTEXITCODE -ne 0) {
  throw 'STOP : aide db push indisponible.'
}
```

Consigner la version affichée : elle doit être exactement `3.0.0`.

Vérifier dans l'aide de `db push` que les options `--remote` et `--skip-vault` sont disponibles. Si l'une des deux options est absente, **STOP**.

Toutes les commandes `db push` de ce runbook doivent utiliser `--skip-vault`, qui empêche la mise à jour des secrets Vault depuis le fichier de configuration. Ne jamais ajouter `--include-roles`, `--include-seed` ou `--include-all`.

Renseigner explicitement les deux références depuis Supabase Dashboard > Project Settings > General :

```powershell
$REF_DEV = Read-Host 'Project ref DEV vérifié dans le Dashboard'
$REF_PROD = Read-Host 'Project ref PRODUCTION vérifié dans le Dashboard'

if (
  [string]::IsNullOrWhiteSpace($REF_DEV) -or
  [string]::IsNullOrWhiteSpace($REF_PROD) -or
  $REF_DEV -eq $REF_PROD
) {
  throw 'STOP : refs DEV/Production absentes ou identiques.'
}
```

Le propriétaire doit vérifier visuellement le nom du projet associé à chaque ref dans le Dashboard avant de continuer.

Consigner les deux références dans le PV. Ne jamais consigner de mot de passe, de clé API ou de chaîne de connexion.

Les preuves textuelles de cette opération seront stockées dans `$EvidenceDir`, hors du dépôt et du worktree d'exécution. Ne pas y placer de chaîne de connexion ni de secret.

### 2.3 Rattrapage DEV avant toute opération Production

Le rattrapage DEV est une opération distincte. Il exige l'autorisation explicite du propriétaire. Ne jamais le faire en même temps que le changement de cible Production.

Dans le worktree d'exécution :

```powershell
npx supabase@3.0.0 link --project-ref $REF_DEV
if ($LASTEXITCODE -ne 0) {
  throw 'STOP : liaison au projet DEV échouée.'
}

$LinkedRef = (Get-Content -LiteralPath '.\supabase\.temp\project-ref' -Raw).Trim()

if ($LinkedRef -ne $REF_DEV) {
  throw 'STOP : la référence locale liée ne correspond pas à DEV.'
}

$DevMigrationBefore = & npx supabase@3.0.0 migration list --remote=$REF_DEV 2>&1
$DevMigrationBeforeExit = $LASTEXITCODE

$DevMigrationBefore | Tee-Object -FilePath (Join-Path $EvidenceDir 'dev-migrations-avant.txt')

if ($DevMigrationBeforeExit -ne 0) {
  throw 'STOP : relevé initial des migrations DEV échoué.'
}

Assert-SupabaseTargetOutput `
  -CommandOutput $DevMigrationBefore `
  -ExpectedRef $REF_DEV `
  -Stage 'relevé initial DEV'

$DevDryRun = & npx supabase@3.0.0 db push --dry-run --skip-vault --remote=$REF_DEV 2>&1
$DevDryRunExit = $LASTEXITCODE

$DevDryRun | Tee-Object -FilePath (Join-Path $EvidenceDir 'dev-dry-run.txt')

if ($DevDryRunExit -ne 0) {
  throw 'STOP : dry-run DEV échoué.'
}

Assert-SupabaseTargetOutput `
  -CommandOutput $DevDryRun `
  -ExpectedRef $REF_DEV `
  -Stage 'dry-run DEV'
```

Vérifier la sortie complète :

- la ligne `Target:` doit identifier le projet DEV et contenir exactement `$REF_DEV` ;
- le dry-run DEV doit proposer **uniquement** `20261120205904_guard_accepted_quote_cancellation.sql` ;
- les deux migrations du 16 novembre doivent apparaître comme déjà appliquées sur DEV ;
- aucune autre migration, rôle, seed ou opération annexe ne doit être proposée.

Tout écart = **STOP**.

Après revue du dry-run, obtenir une autorisation écrite, datée et distincte du propriétaire pour l'application DEV. Sans cette autorisation : ne pas exécuter la commande suivante.

Avant application, vérifier à nouveau le terminal et les protections :

```powershell
Assert-SupabaseInteractive
```

L'application DEV se fait depuis le terminal PowerShell interactif, sans pipe, sans redirection et sans `--yes` :

```powershell
$DevTranscript = Join-Path $EvidenceDir ("dev-push-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".txt")

Start-Transcript -Path $DevTranscript -NoClobber

$DevPushExit = $null

try {
  Assert-SupabaseInteractive

  npx supabase@3.0.0 db push --skip-vault --remote=$REF_DEV
  $DevPushExit = $LASTEXITCODE
}
finally {
  Stop-Transcript | Out-Null
}

if ($DevPushExit -ne 0) {
  throw 'STOP : db push DEV non terminé correctement. Ne pas relancer automatiquement.'
}
```

Avant de confirmer dans le CLI :

1. vérifier que `Target:` correspond au project ref DEV ;
2. vérifier que la liste proposée correspond strictement au dry-run ;
3. vérifier qu'aucun élément annexe n'est proposé ;
4. confirmer uniquement après ces contrôles.

Le CLI doit afficher une confirmation interactive dont la réponse par défaut est `No`. Ne pas utiliser `--yes`, ne pas définir `SUPABASE_YES` et ne pas contourner l'absence de prompt.

Puis vérifier le relevé distant :

```powershell
$DevMigrationAfter = & npx supabase@3.0.0 migration list --remote=$REF_DEV 2>&1
$DevMigrationAfterExit = $LASTEXITCODE

$DevMigrationAfter | Tee-Object -FilePath (Join-Path $EvidenceDir 'dev-migrations-apres.txt')

if ($DevMigrationAfterExit -ne 0) {
  throw 'STOP : relevé DEV après application échoué.'
}

Assert-SupabaseTargetOutput `
  -CommandOutput $DevMigrationAfter `
  -ExpectedRef $REF_DEV `
  -Stage 'relevé DEV après application'
```

Les trois versions doivent maintenant apparaître comme appliquées sur DEV.

En cas d'échec du `db push` DEV, ne pas relancer la commande. Faire un relevé `migration list --remote=$REF_DEV` en lecture seule pour déterminer l'état réel des migrations, puis traiter l'incident conformément au §7.

#### Scénarios fonctionnels obligatoires sur DEV

Utiliser exclusivement des données fictives dédiées aux tests :

1. Devis accepté + brouillon de facture lié au statut `draft` : annulation refusée, message indiquant que le brouillon doit être abandonné, SQLSTATE `55000`, devis toujours `accepted`, aucun événement `quotes.cancelled` ajouté.

2. Abandon du brouillon avec motif, puis annulation du devis accepté : annulation acceptée, statut `cancelled`, événement `quotes.cancelled` avec `previous_status = accepted`.

3. Sur un autre devis accepté : après abandon d'un premier brouillon, un nouveau brouillon peut être créé depuis ce devis ; tant que ce second brouillon est `draft`, une nouvelle tentative d'annulation doit être refusée. C'est le contrôle de non-régression ajouté par la PR #138.

Consigner les identifiants des données fictives, les heures, les résultats et les événements d'audit dans les preuves DEV et dans le PV.

Ne pas utiliser de données officielles ou de vrais clients.

Tout échec de scénario = **STOP**. Ne pas poursuivre vers Production.

### 2.4 Sauvegarde fraîche de Production — ACC-07

La sauvegarde Production doit être réalisée **après la réussite complète du rattrapage et des scénarios DEV**, dans la même fenêtre de maintenance que l'application Production.

Si un délai important s'écoule entre la sauvegarde et l'application, si une nouvelle journée d'intervention commence ou si un événement pouvant affecter la base survient, refaire la sauvegarde et la restauration à blanc avant de reprendre.

Les scripts réels ont été vérifiés :

- `scripts/backup-db.sh` exige `DATABASE_URL`, appelle `pg_dump --no-password`, crée `./backups/backup_gestion_db_<horodatage>_<pid>.sql`, applique `umask 077`, protège le dossier en `700` et le fichier final en `600` ;
- le dossier `./backups` est relatif au **répertoire courant**. Il faut donc lancer le script depuis un répertoire protégé **hors du dépôt**, pas depuis la racine Git ;
- `scripts/restore-db.sh` exige `DATABASE_URL` et le chemin du fichier. Il vérifie que la base cible ne contient aucun objet applicatif avant de restaurer avec `psql -v ON_ERROR_STOP=1`. Il refuse une cible non vide et ne la vide pas.

Effectuer cette étape depuis WSL 2, dans le système de fichiers Linux de la distribution, afin que les permissions Unix `700` et `600` soient réellement appliquées. Ne pas placer la sauvegarde sous `/mnt/c` en supposant que `chmod` suffit à protéger les fichiers Windows. Si WSL n'est pas disponible, **STOP** et définir au préalable une procédure de permissions NTFS vérifiée.

Dans WSL, depuis la racine du worktree d'exécution :

```bash
WORKTREE_BASH="$(pwd -P)"

if [[ ! -f "$WORKTREE_BASH/scripts/backup-db.sh" || ! -f "$WORKTREE_BASH/scripts/restore-db.sh" ]]; then
  printf '%s\n' 'STOP : scripts de sauvegarde/restauration introuvables.' >&2
  exit 1
fi

SAFE_DIR="$HOME/polygest-prod-phase2-evidence"

case "$SAFE_DIR" in
  /mnt/*)
    printf '%s\n' 'STOP : SAFE_DIR doit être dans le système de fichiers Linux WSL, pas sous /mnt.' >&2
    exit 1
    ;;
esac

case "$SAFE_DIR/" in
  "$WORKTREE_BASH/"*)
    printf '%s\n' 'STOP : le dossier de sauvegarde ne doit pas être dans le dépôt.' >&2
    exit 1
    ;;
esac

mkdir -p "$SAFE_DIR" || exit 1
chmod 700 "$SAFE_DIR" || exit 1
cd "$SAFE_DIR" || exit 1
umask 077

read -rsp 'DATABASE_URL directe Production (pas le pooler) : ' DATABASE_URL
printf '\n'

if [[ -z "$DATABASE_URL" ]]; then
  printf '%s\n' 'STOP : chaîne de connexion absente.' >&2
  unset DATABASE_URL
  exit 1
fi

export DATABASE_URL

if ! bash "$WORKTREE_BASH/scripts/backup-db.sh"; then
  unset DATABASE_URL
  printf '%s\n' 'STOP : échec de la sauvegarde Production.' >&2
  exit 1
fi

unset DATABASE_URL
```

Le dossier `SAFE_DIR` doit être hors du dépôt et accessible uniquement à l'opérateur.

Le script crée le dossier `backups` **dans le répertoire courant**, donc sous `$SAFE_DIR/backups`.

Copier le chemin exact annoncé par `backup-db.sh` dans `BACKUP_FILE`. Ne jamais conserver littéralement les marqueurs `<horodatage>_<pid>` :

```bash
BACKUP_FILE="$SAFE_DIR/backups/backup_gestion_db_<horodatage>_<pid>.sql"

case "$BACKUP_FILE" in
  "$SAFE_DIR"/backups/*) ;;
  *)
    printf '%s\n' 'STOP : chemin de sauvegarde hors du dossier protégé.' >&2
    exit 1
    ;;
esac

test -s "$BACKUP_FILE" || {
  printf '%s\n' 'STOP : sauvegarde absente ou vide.' >&2
  exit 1
}

[[ "$(stat -c '%a' "$SAFE_DIR")" == '700' ]] || {
  printf '%s\n' 'STOP : permissions du dossier de sauvegarde incorrectes.' >&2
  exit 1
}

[[ "$(stat -c '%a' "$SAFE_DIR/backups")" == '700' ]] || {
  printf '%s\n' 'STOP : permissions du sous-dossier backups incorrectes.' >&2
  exit 1
}

[[ "$(stat -c '%a' "$BACKUP_FILE")" == '600' ]] || {
  printf '%s\n' 'STOP : permissions du fichier de sauvegarde incorrectes.' >&2
  exit 1
}

sha256sum -- "$BACKUP_FILE" > "$BACKUP_FILE.sha256" || exit 1
chmod 600 "$BACKUP_FILE.sha256" || exit 1
sha256sum -c "$BACKUP_FILE.sha256" || exit 1
```

Conserver la sauvegarde et son empreinte hors dépôt, avec accès restreint.

Ne jamais coller l'URL Production dans une ligne de commande, dans le PV, dans une capture d'écran ou dans un rapport.

Ne jamais placer la sauvegarde, son empreinte ou un fichier contenant des identifiants dans un commit Git.

### 2.5 Restauration à blanc — base jetable locale uniquement

La restauration à blanc doit être effectuée sur une nouvelle base vide créée dans le cluster PostgreSQL local du laboratoire Supabase de restauration, afin que les rôles Supabase nécessaires existent déjà au niveau du cluster.

Ne pas restaurer dans :

- la base `postgres` du stack local ;
- une base DEV ;
- Production ;
- une base locale contenant des données ou objets applicatifs.

#### Identification du stack local

Démarrer le laboratoire local de restauration dédié.

Dans le répertoire de ce laboratoire, exécuter :

```bash
npx supabase@3.0.0 status
```

Lire uniquement les informations nécessaires à la connexion PostgreSQL locale : hôte et port publiés. La sortie peut également contenir des clés ou valeurs sensibles ; ne pas la copier intégralement dans le PV ni la partager.

Dans ce laboratoire, le port précédemment utilisé était `54322`. Il doit être confirmé par le résultat actuel de `supabase status` avant toute utilisation. Si le port a changé, remplacer la valeur ci-dessous par le port exact affiché.

```bash
LOCAL_DB_PORT='54322'

if [[ ! "$LOCAL_DB_PORT" =~ ^[1-9][0-9]{0,4}$ ]] || (( 10#$LOCAL_DB_PORT > 65535 )); then
  printf '%s\n' 'STOP : port PostgreSQL local invalide.' >&2
  exit 1
fi
```

Les deux URL PostgreSQL suivantes doivent utiliser ce même port. Elles ne doivent contenir aucun paramètre de connexion additionnel.

#### Création de la base jetable

L'URL administrateur doit viser exclusivement l'hôte `127.0.0.1` ou `localhost`, sur le port du stack local vérifié, et la base `postgres`.

```bash
read -rsp 'URL admin PostgreSQL LOCAL (base postgres) : ' LOCAL_ADMIN_URL
printf '\n'

if [[ "$LOCAL_ADMIN_URL" =~ ^postgres(ql)?://([^/@]*@)?(127\.0\.0\.1|localhost):([0-9]+)/postgres$ ]]; then
  ADMIN_DB_PORT="${BASH_REMATCH[4]}"
else
  printf '%s\n' 'STOP : URL admin non conforme. Hôte local et base postgres exigés.' >&2
  unset LOCAL_ADMIN_URL
  exit 1
fi

if [[ "$ADMIN_DB_PORT" != "$LOCAL_DB_PORT" ]]; then
  printf '%s\n' 'STOP : port différent du stack local vérifié.' >&2
  unset LOCAL_ADMIN_URL ADMIN_DB_PORT
  exit 1
fi

ADMIN_DB_NAME="$(psql --no-password -Atqc 'select current_database();' "$LOCAL_ADMIN_URL")" || {
  unset LOCAL_ADMIN_URL ADMIN_DB_PORT ADMIN_DB_NAME
  exit 1
}

if [[ "$ADMIN_DB_NAME" != 'postgres' ]]; then
  printf '%s\n' 'STOP : la connexion administrateur ne cible pas postgres.' >&2
  unset LOCAL_ADMIN_URL ADMIN_DB_PORT ADMIN_DB_NAME
  exit 1
fi

psql --no-password -v ON_ERROR_STOP=1 "$LOCAL_ADMIN_URL" -c 'CREATE DATABASE verify_restore;' || {
  unset LOCAL_ADMIN_URL ADMIN_DB_PORT ADMIN_DB_NAME
  printf '%s\n' 'STOP : création de verify_restore impossible. Ne pas contourner cette erreur.' >&2
  exit 1
}

unset LOCAL_ADMIN_URL ADMIN_DB_PORT ADMIN_DB_NAME
```

Si `CREATE DATABASE verify_restore` échoue, notamment parce que la base existe déjà, **STOP**. Ne pas supprimer, vider ou réutiliser une base existante pour contourner le contrôle.

#### Restauration dans `verify_restore`

L'URL de restauration doit viser exclusivement :

- `127.0.0.1` ou `localhost` ;
- le port `$LOCAL_DB_PORT` ;
- la base `/verify_restore`.

```bash
read -rsp 'DATABASE_URL LOCAL de verify_restore : ' DATABASE_URL
printf '\n'

if [[ "$DATABASE_URL" =~ ^postgres(ql)?://([^/@]*@)?(127\.0\.0\.1|localhost):([0-9]+)/verify_restore$ ]]; then
  RESTORE_DB_PORT="${BASH_REMATCH[4]}"
else
  printf '%s\n' 'STOP : URL non conforme. Hôte local et base verify_restore exigés.' >&2
  unset DATABASE_URL
  exit 1
fi

if [[ "$RESTORE_DB_PORT" != "$LOCAL_DB_PORT" ]]; then
  printf '%s\n' 'STOP : port différent du stack local vérifié.' >&2
  unset DATABASE_URL RESTORE_DB_PORT
  exit 1
fi

RESTORE_DB_NAME="$(psql --no-password -Atqc 'select current_database();' "$DATABASE_URL")" || {
  unset DATABASE_URL RESTORE_DB_NAME RESTORE_DB_PORT
  exit 1
}

if [[ "$RESTORE_DB_NAME" != 'verify_restore' ]]; then
  printf '%s\n' 'STOP : la connexion ne cible pas verify_restore.' >&2
  unset DATABASE_URL RESTORE_DB_NAME RESTORE_DB_PORT
  exit 1
fi

psql --no-password -Atqc 'select inet_server_addr(), inet_server_port();' "$DATABASE_URL" || {
  unset DATABASE_URL RESTORE_DB_NAME RESTORE_DB_PORT
  exit 1
}

test -s "$BACKUP_FILE" || {
  printf '%s\n' 'STOP : sauvegarde introuvable ou vide.' >&2
  unset DATABASE_URL RESTORE_DB_NAME RESTORE_DB_PORT
  exit 1
}

export DATABASE_URL

if ! bash "$WORKTREE_BASH/scripts/restore-db.sh" "$BACKUP_FILE"; then
  unset DATABASE_URL RESTORE_DB_NAME RESTORE_DB_PORT
  printf '%s\n' 'STOP : échec de restauration.' >&2
  exit 1
fi
```

Le script doit annoncer la restauration terminée.

Toute erreur, cible inattendue ou base non vide = **STOP**. Ne pas essayer de contourner le contrôle de `restore-db.sh`.

L'adresse retournée par `inet_server_addr()` peut être l'adresse privée de l'interface réseau du conteneur Docker. La consigner, mais ne pas exiger qu'elle soit égale à `127.0.0.1`. La validation de la cible client repose sur l'URL, l'hôte et le port explicitement contrôlés.

#### Vérifications en lecture seule sur `verify_restore`

Après restauration, conserver `DATABASE_URL` exportée uniquement le temps d'exécuter les contrôles ci-dessous.

Les contrôles doivent être exécutés dans une transaction explicitement en lecture seule :

```bash
if psql --no-password -v ON_ERROR_STOP=1 "$DATABASE_URL" <<'SQL'
BEGIN TRANSACTION READ ONLY;

SELECT current_database() AS restored_database;

WITH expected(table_name) AS (
  VALUES
    ('companies'),
    ('quotes'),
    ('quote_lines'),
    ('invoices'),
    ('invoice_lines'),
    ('audit_events')
),
checks AS (
  SELECT
    e.table_name,
    (c.oid IS NOT NULL) AS table_exists,
    COALESCE(c.relrowsecurity, false) AS rls_enabled
  FROM expected e
  LEFT JOIN pg_namespace n
    ON n.nspname = 'public'
  LEFT JOIN pg_class c
    ON c.relnamespace = n.oid
   AND c.relname = e.table_name
   AND c.relkind IN ('r', 'p')
)
SELECT
  table_name,
  table_exists,
  rls_enabled,
  (table_exists AND rls_enabled) AS check_ok
FROM checks
ORDER BY table_name;

SELECT
  to_regprocedure('public.cancel_quote(uuid,uuid,text)') IS NOT NULL
    AS cancel_quote_present,
  to_regprocedure('public.save_invoice_draft(uuid,uuid,jsonb,date,date,uuid,text,text,text)') IS NOT NULL
    AS save_invoice_draft_present;

SELECT
  expected.role_name,
  (actual.rolname IS NOT NULL) AS role_exists
FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS expected(role_name)
LEFT JOIN pg_roles AS actual
  ON actual.rolname = expected.role_name;

SELECT
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.invoice_lines'::regclass
  AND contype = 'c'
ORDER BY conname;

SELECT 'companies' AS table_name, count(*)::bigint AS row_count FROM public.companies
UNION ALL
SELECT 'quotes', count(*)::bigint FROM public.quotes
UNION ALL
SELECT 'quote_lines', count(*)::bigint FROM public.quote_lines
UNION ALL
SELECT 'invoices', count(*)::bigint FROM public.invoices
UNION ALL
SELECT 'invoice_lines', count(*)::bigint FROM public.invoice_lines
UNION ALL
SELECT 'audit_events', count(*)::bigint FROM public.audit_events;

COMMIT;
SQL
then
  unset DATABASE_URL RESTORE_DB_NAME RESTORE_DB_PORT
else
  unset DATABASE_URL RESTORE_DB_NAME RESTORE_DB_PORT
  printf '%s\n' 'STOP : contrôles SQL de restauration échoués.' >&2
  exit 1
fi
```

Conditions attendues :

- `current_database()` retourne `verify_restore` ;
- les six tables listées existent ;
- RLS est activée sur chacune de ces tables ;
- les fonctions `public.cancel_quote(uuid,uuid,text)` et `public.save_invoice_draft(uuid,uuid,jsonb,date,date,uuid,text,text,text)` sont présentes ;
- les rôles `anon`, `authenticated` et `service_role` existent ;
- les contraintes de `public.invoice_lines` sont relevées, notamment la contrainte de positivité préexistante et `invoice_lines_quantity_finite_check` si cette dernière figure dans la sauvegarde ;
- les comptes de lignes sont relevés dans le PV.

Toute table absente, toute RLS désactivée sur une table attendue, toute fonction ou tout rôle manquant = **STOP** et investigation avant toute opération Production.

Les nombres de lignes d'une requête sur Production effectuée après la sauvegarde ne constituent pas une comparaison exacte de la même photographie si l'application a continué à écrire entre-temps. Toute comparaison chiffrée doit préciser l'heure et la limite de cette différence temporelle.

Après les contrôles, `DATABASE_URL` doit être supprimée de l'environnement avec `unset`, comme dans le bloc ci-dessus.

La base `verify_restore` reste une base jetable locale. Son éventuel nettoyage est une opération distincte, uniquement après vérification répétée de la cible locale et du nom exact de la base. Ne jamais réutiliser une commande de nettoyage contre un projet hébergé.

### 2.6 Préconditions de mise en Production

Toutes les cases doivent être confirmées avant le relevé initial, le dry-run et l'application Production.

- [ ] Worktree au SHA exact, propre, sans migration hors lot.
- [ ] Trois fichiers de migration du §1 présents ; migration de stabilité de devise absente.
- [ ] CLI `3.0.0` vérifiée ; options `--remote` et `--skip-vault` présentes.
- [ ] `SUPABASE_YES` absent du shell et des fichiers d'environnement vérifiés.
- [ ] CI verte sur le commit figé ; conserver le lien du run.
- [ ] Déploiement Vercel Production `READY` sur ce commit ou sur un commit antérieur explicitement vérifié compatible ; consigner le SHA réellement déployé.
- [ ] Rattrapage DEV terminé et relevé vérifié.
- [ ] Trois scénarios fonctionnels DEV réussis sur données fictives.
- [ ] Sauvegarde Production fraîche créée après validation DEV, dans la même fenêtre de maintenance.
- [ ] Empreinte SHA-256 de sauvegarde vérifiée ; permissions confirmées.
- [ ] Restauration à blanc réussie sur `verify_restore` locale.
- [ ] Tables, fonctions, rôles et RLS de la restauration vérifiés.
- [ ] Référence Production vérifiée visuellement depuis le Dashboard.
- [ ] Relevé initial Production conforme au §3.
- [ ] Dry-run Production conforme au §4.
- [ ] Plan de retour arrière §7 prêt.
- [ ] Autorisation écrite, datée et explicite du propriétaire pour l'application Production.

Si une sauvegarde doit être refaite, refaire également sa restauration à blanc et ses vérifications avant d'autoriser l'application.

## 3. Relevé initial Production — lecture seule

Dans le worktree d'exécution :

```powershell
npx supabase@3.0.0 link --project-ref $REF_PROD
if ($LASTEXITCODE -ne 0) {
  throw 'STOP : liaison au projet Production échouée.'
}

$LinkedRef = (Get-Content -LiteralPath '.\supabase\.temp\project-ref' -Raw).Trim()

if ($LinkedRef -ne $REF_PROD) {
  throw 'STOP : la référence locale liée ne correspond pas à Production.'
}

$ProdMigrationBefore = & npx supabase@3.0.0 migration list --remote=$REF_PROD 2>&1
$ProdMigrationBeforeExit = $LASTEXITCODE

$ProdMigrationBefore | Tee-Object -FilePath (Join-Path $EvidenceDir 'prod-migrations-avant.txt')

if ($ProdMigrationBeforeExit -ne 0) {
  throw 'STOP : relevé initial des migrations Production échoué.'
}

Assert-SupabaseTargetOutput `
  -CommandOutput $ProdMigrationBefore `
  -ExpectedRef $REF_PROD `
  -Stage 'relevé initial Production'
```

La sortie complète doit être conservée dans `$EvidenceDir`.

La référence liée localement doit correspondre exactement à `$REF_PROD`. La ligne `Target:` de la sortie distante doit identifier le projet Production et contenir cette même référence.

La sortie distante attendue au vu de l'état documentaire est : les 18 migrations Phase 1 et `20261109161232_factures_brouillons` déjà enregistrées ; les trois versions du §1 absentes côté distant.

Le nombre 19 est une attente issue du relevé documentaire, pas une preuve en soi. La liste réelle des timestamps fait foi.

Toute version inconnue, version manquante, migration distante supplémentaire ou divergence locale/distante non expliquée = **STOP** et investigation avant tout dry-run.

Ne pas utiliser `migration repair` pour corriger une divergence pendant cette opération.

## 4. Dry-run Production ciblé

Depuis le worktree d'exécution :

```powershell
$ProdDryRun = & npx supabase@3.0.0 db push --dry-run --skip-vault --remote=$REF_PROD 2>&1
$ProdDryRunExit = $LASTEXITCODE

$ProdDryRun | Tee-Object -FilePath (Join-Path $EvidenceDir 'prod-dry-run.txt')

if ($ProdDryRunExit -ne 0) {
  throw 'STOP : dry-run Production échoué.'
}

Assert-SupabaseTargetOutput `
  -CommandOutput $ProdDryRun `
  -ExpectedRef $REF_PROD `
  -Stage 'dry-run Production'
```

La sortie complète, notamment la ligne `Target:`, doit être conservée dans `$EvidenceDir`.

Vérifier manuellement la sortie attendue :

- la ligne `Target:` identifie le projet Production correspondant exactement à `$REF_PROD` ;
- les seules migrations proposées sont, dans l'ordre chronologique :
  - `20261116142111_invoice_quantity_finite_check.sql` ;
  - `20261116203000_devis_annulation_accepte.sql` ;
  - `20261120205904_guard_accepted_quote_cancellation.sql` ;
- aucune migration supplémentaire, aucun rôle, seed ou changement annexe non prévu.

Le dry-run ne doit rien appliquer.

Si la CLI propose une autre cible, si elle ne présente pas les trois migrations exactes, ou si elle propose un élément additionnel : **STOP**. Ne pas utiliser `--include-all` pour forcer le lot.

Copier la sortie intégrale dans le PV.

## 5. Application Production — heures creuses

Cette étape n'est possible qu'après validation de toutes les préconditions du §2.6, validation du relevé initial (§3), revue du dry-run (§4) et autorisation écrite distincte du propriétaire.

Avant de lancer la commande, vérifier encore :

```powershell
Assert-SupabaseInteractive
```

L'application doit être réalisée par le propriétaire lui-même depuis le terminal PowerShell local interactif, jamais depuis une session d'agent d'exécution, un script automatisé ou une console dont les entrées/sorties sont redirigées.

Conserver la sortie de l'application dans un transcript PowerShell, sans rediriger ni canaliser la commande afin de préserver le prompt interactif :

```powershell
$ProdTranscript = Join-Path $EvidenceDir ("prod-push-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".txt")

Start-Transcript -Path $ProdTranscript -NoClobber

$ProdPushExit = $null

try {
  Assert-SupabaseInteractive

  npx supabase@3.0.0 db push --skip-vault --remote=$REF_PROD
  $ProdPushExit = $LASTEXITCODE
}
finally {
  Stop-Transcript | Out-Null
}

if ($ProdPushExit -ne 0) {
  throw 'STOP : db push Production non terminé correctement. Ne pas relancer.'
}
```

Le CLI doit afficher la cible distante et demander une confirmation interactive. Avant de répondre :

1. vérifier que `Target:` correspond au project ref Production enregistré au PV ;
2. vérifier que la liste est strictement identique au §4 ;
3. vérifier qu'aucun rôle, seed, secret Vault ou autre élément annexe n'est proposé ;
4. confirmer uniquement après ces contrôles.

Ne jamais passer `--yes`, ne jamais définir `SUPABASE_YES`, ne jamais contourner une absence de prompt et ne jamais relancer automatiquement la commande après une erreur.

**Un code de sortie non nul peut correspondre à une application partielle.** Ne pas supposer que rien n'a été appliqué. Passer uniquement au relevé distant en lecture seule du §6.1 pour connaître l'état exact, puis traiter l'incident conformément au §7. Ne pas relancer `db push`.

Consigner les heures de début/fin et la sortie complète.

## 6. Post-contrôles

### 6.1 Historique distant

```powershell
$ProdMigrationAfter = & npx supabase@3.0.0 migration list --remote=$REF_PROD 2>&1
$ProdMigrationAfterExit = $LASTEXITCODE

$ProdMigrationAfter | Tee-Object -FilePath (Join-Path $EvidenceDir 'prod-migrations-apres.txt')

if ($ProdMigrationAfterExit -ne 0) {
  throw 'STOP : relevé des migrations Production après application échoué.'
}

Assert-SupabaseTargetOutput `
  -CommandOutput $ProdMigrationAfter `
  -ExpectedRef $REF_PROD `
  -Stage 'relevé Production après application'
```

Les trois versions du lot doivent maintenant figurer côté distant. Aucune autre migration ne doit avoir été ajoutée.

Comparer les relevés avant/après et joindre les deux sorties au PV.

### 6.2 Contrôles SQL en lecture seule

Exécuter dans le SQL Editor du Dashboard Production uniquement les requêtes `SELECT` ci-dessous. Ne pas exécuter de DDL ou de DML manuel.

**a) Contrainte présente, validée et attachée à la bonne table**

Attendu : une ligne, `convalidated = true`.

```sql
select
  conname,
  convalidated,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.invoice_lines'::regclass
  and conname = 'invoice_lines_quantity_finite_check'
  and contype = 'c';
```

La définition doit correspondre à la règle de la migration : `quantity < 'Infinity'::numeric`.

Pour examiner également les autres contraintes de la table, notamment la règle de positivité préexistante :

```sql
select
  conname,
  convalidated,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.invoice_lines'::regclass
  and contype = 'c'
order by conname;
```

Ne pas modifier manuellement les contraintes.

**b) Garde de brouillon actif présente**

Attendu : `garde_presente = true` et `sqlstate_55000_present = true`.

```sql
select
  position(
    'brouillon de facture lié doit être abandonné'
    in lower(pg_get_functiondef('public.cancel_quote(uuid,uuid,text)'::regprocedure))
  ) > 0 as garde_presente,
  position(
    '55000'
    in pg_get_functiondef('public.cancel_quote(uuid,uuid,text)'::regprocedure)
  ) > 0 as sqlstate_55000_present;
```

**c) Droits d'exécution**

Attendu : `authenticated_execute = true`, `anon_execute = false`.

```sql
select
  has_function_privilege(
    'authenticated',
    'public.cancel_quote(uuid,uuid,text)',
    'EXECUTE'
  ) as authenticated_execute,
  has_function_privilege(
    'anon',
    'public.cancel_quote(uuid,uuid,text)',
    'EXECUTE'
  ) as anon_execute;
```

Si un résultat est inattendu, arrêter les opérations et analyser la fonction ou les privilèges sans exécuter de SQL correctif manuel.

### 6.3 Application et garde-fous

- [ ] Vercel Production toujours `READY` ; vérifier les parcours déjà ouverts, en lecture uniquement.
- [ ] `POLYGEST_INVOICES_ENABLED=false` confirmé dans la configuration Production, sans changement.
- [ ] `DOCUMENT_SCANNER_ENABLED=false` confirmé dans la configuration Production, sans changement.
- [ ] Aucune émission, numérotation, taxe, paiement ou activation de facturation n'a été déclenchée.
- [ ] Les sorties, heures et contrôles sont joints au PV.

Aucun test créant des brouillons ou modifiant des données ne doit être exécuté sur Production dans ce runbook.

Un éventuel test Production sur données fictives nécessite une décision et une autorisation séparées ; il n'est pas recommandé pour ce lot.

## 7. Retour arrière et gestion d'incident

Le retour arrière fonctionnel est **forward-only** : ne jamais réécrire l'historique des migrations et ne pas ré-exécuter manuellement du SQL de modification dans le Dashboard.

En cas de défaut après application :

1. suspendre toute opération additionnelle ; conserver les sorties CLI, le transcript, l'état observé et les heures ;
2. effectuer uniquement un relevé des migrations distant en lecture seule pour établir lesquelles ont effectivement été appliquées ;
3. évaluer l'impact applicatif et l'intégrité des données ;
4. privilégier un correctif en avant ;
5. si une fonction doit retrouver son comportement antérieur, créer une nouvelle migration corrective additive qui redéfinit la fonction voulue ;
6. si la contrainte de quantité est en cause, ne pas la supprimer automatiquement : une suppression affaiblit l'intégrité et exige une analyse de risque et une autorisation écrite distincte ;
7. soumettre toute correction à une PR, CI, dry-run ciblé et autorisation séparée avant application.

Un échec de `db push` peut avoir laissé certaines migrations appliquées et d'autres en attente. Ne pas relancer la commande avant d'avoir établi précisément l'état distant et obtenu une décision distincte.

Les entrées de l'historique Supabase restent intactes. **Ne pas utiliser `migration repair` pour faire croire qu'une migration n'a pas été appliquée.**

`scripts/restore-db.sh` est prévu pour restaurer dans une base cible vide et refuse une cible contenant déjà des objets applicatifs. Il n'est pas une procédure de rollback Production. Une restauration d'urgence d'une base hébergée nécessiterait un plan de reprise spécifique, validé séparément ; elle n'est pas couverte par ce runbook.

## 8. Procès-verbal d'application (PV)

Créer et versionner le PV dans `docs/` après l'opération.

Il doit contenir :

- date/heure UTC, opérateur et approbation écrite du propriétaire ;
- projet ciblé, project ref DEV/Production, CLI `3.0.0`, version du worktree et SHA du commit ;
- preuve du worktree propre et de l'absence de migration hors lot ;
- preuve que `SUPABASE_YES` était absent du shell et des fichiers d'environnement vérifiés ;
- SHA de sauvegarde (nom du fichier), empreinte SHA-256, permissions et emplacement protégé — jamais l'URL ou le mot de passe ;
- résultat détaillé de la restauration à blanc locale : hôte client, port, base `verify_restore`, adresse serveur observée, présence des tables, RLS, fonctions et rôles ;
- comptes de lignes de la sauvegarde restaurée ;
- relevé migration list avant et après ;
- sortie intégrale du dry-run, ligne `Target:` et transcription de l'application ;
- versions appliquées, début/fin, confirmation interactive ;
- résultats des contrôles SQL §6 et état des flags ;
- état Vercel Production ;
- incidents, décisions et éventuelles corrections ;
- signature du propriétaire.

Ne jamais inclure dans le PV une chaîne de connexion, un mot de passe, une clé API, un secret ou une valeur d'environnement sensible.

Conserver les fichiers de preuve bruts hors du dépôt, dans les répertoires protégés prévus aux §2.2 et §2.4. Ne joindre au dépôt que le PV expurgé de toute donnée sensible.

## 9. Après l'opération

Après validation du PV et confirmation de l'état réel :

- mettre à jour `README.md`, `docs/ROADMAP.md` §4.1, `supabase/README.md` et `supabase/phase2-migrations/README.md` avec les versions réellement appliquées, la date, le commit et le lien du PV ;
- conserver distincts les états « code fusionné », « déployé », « migration appliquée », « testé », « validé » et « module activé » ;
- maintenir `POLYGEST_INVOICES_ENABLED=false` en Production ;
- garder `DOCUMENT_SCANNER_ENABLED=false` tant que le dispositif de scan n'est pas disponible et validé ;
- traiter la migration `20261125095431_factures_devise_stable.sql` dans un lot 2 séparé, avec sa propre PR, CI, sauvegarde, dry-run et autorisation.

L'application des trois migrations du lot 1 ne vaut ni validation fiscale, ni autorisation d'émettre des factures, ni mise en service du module Factures.

## Sources et références vérifiées

- Supabase CLI v3 — migration depuis v2 et changements de ciblage et de confirmation :
  https://supabase.com/docs/guides/local-development/cli/migrating-to-v3

- Supabase CLI — projets locaux et hébergés, résolution des fichiers d'environnement, confirmations et ligne `Target:` :
  https://supabase.com/docs/guides/local-development/local-and-hosted-projects

- Supabase CLI — référence `db push`, options `--dry-run`, `--remote` et `--skip-vault` :
  https://supabase.com/docs/reference/cli/supabase-db-push

- Supabase CLI — référence `migration list` :
  https://supabase.com/docs/reference/cli/supabase-migration-list

- PostgreSQL — types `numeric`, `Infinity`, `-Infinity` et `NaN` :
  https://www.postgresql.org/docs/current/datatype-numeric.html

- PR #138 — garde d'annulation d'un devis accepté :
  https://github.com/toussaink59-cpu/gestion-entreprise-universelle/pull/138

- Commit de référence :
  `2196ddbd0c5f901247c1c201fbf102122543cd8b`
