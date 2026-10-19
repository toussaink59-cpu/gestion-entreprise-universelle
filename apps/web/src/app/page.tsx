const navigation = [
  { icon: "▦", label: "Vue d'ensemble", active: true },
  { icon: "♙", label: "Clients & fournisseurs", active: false },
  { icon: "▤", label: "Ventes & factures", active: false },
  { icon: "↗", label: "Dépenses", active: false },
  { icon: "◉", label: "Trésorerie", active: false },
  { icon: "▥", label: "Budget", active: false },
  { icon: "♧", label: "Personnel & paie", active: false },
  { icon: "▧", label: "Stocks", active: false },
  { icon: "▤", label: "Rapports", active: false },
];

const stats = [
  {
    label: "Chiffre d'affaires",
    value: "4 850 000",
    detail: "FCFA · ce mois",
    trend: "+12,8 %",
    symbol: "↗",
    color: "bg-blue-50 text-blue-700",
  },
  {
    label: "Dépenses",
    value: "1 420 000",
    detail: "FCFA · ce mois",
    trend: "+5,2 %",
    symbol: "↘",
    color: "bg-orange-50 text-orange-700",
  },
  {
    label: "Trésorerie",
    value: "3 250 000",
    detail: "FCFA · solde indicatif",
    trend: "Disponible",
    symbol: "◉",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Factures impayées",
    value: "675 000",
    detail: "FCFA · 6 factures",
    trend: "À suivre",
    symbol: "!",
    color: "bg-rose-50 text-rose-700",
  },
];

const transactions = [
  {
    initials: "AD",
    name: "Adama Distribution",
    type: "Paiement client",
    date: "19 oct. 2026",
    amount: "+ 250 000",
    status: "Encaissé",
    color: "bg-blue-100 text-blue-700",
  },
  {
    initials: "BF",
    name: "Bureau & Fournitures",
    type: "Achat de fournitures",
    date: "18 oct. 2026",
    amount: "- 85 000",
    status: "Payé",
    color: "bg-orange-100 text-orange-700",
  },
  {
    initials: "SK",
    name: "Services Kaboré",
    type: "Prestation de service",
    date: "17 oct. 2026",
    amount: "+ 420 000",
    status: "Encaissé",
    color: "bg-violet-100 text-violet-700",
  },
  {
    initials: "TR",
    name: "Transport Wendpanga",
    type: "Frais de transport",
    date: "16 oct. 2026",
    amount: "- 45 000",
    status: "Payé",
    color: "bg-amber-100 text-amber-700",
  },
];

const budgets = [
  { label: "Salaires", spent: "750 000", total: "1 000 000", width: "75%", color: "bg-blue-600" },
  { label: "Achats & fournitures", spent: "420 000", total: "600 000", width: "70%", color: "bg-violet-600" },
  { label: "Transport", spent: "160 000", total: "250 000", width: "64%", color: "bg-amber-500" },
  { label: "Fonctionnement", spent: "90 000", total: "200 000", width: "45%", color: "bg-emerald-600" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
              G
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">GestionPro</h1>
              <p className="text-xs text-slate-500">Votre entreprise, unifiée</p>
            </div>
          </div>

          <div className="border-b border-slate-100 p-4">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Entreprise active</p>
              <p className="mt-1 font-semibold">Mon entreprise</p>
              <p className="mt-1 text-xs text-slate-500">Burkina Faso · FCFA</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
            <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.16em] text-slate-400">
              ESPACE DE TRAVAIL
            </p>

            {navigation.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                  item.active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600"
                }`}
              >
                <span className="w-5 text-center text-lg">{item.icon}</span>
                {item.label}
                {item.label === "Factures" && (
                  <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                    6
                  </span>
                )}
              </div>
            ))}

            <div className="mt-8 border-t border-slate-100 pt-5">
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.16em] text-slate-400">
                CONFIGURATION
              </p>
              <div className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-600">
                <span className="w-5 text-center text-lg">⚙</span>
                Paramètres
              </div>
            </div>
          </nav>

          <div className="border-t border-slate-100 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                AD
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Administrateur</p>
                <p className="text-xs text-slate-500">Compte de démonstration</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white lg:hidden">
                G
              </div>
              <div>
                <p className="text-xs text-slate-500">Espace de gestion</p>
                <p className="text-sm font-semibold">Vue d'ensemble</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 sm:block">
                Burkina Faso · FCFA
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white">
                ♧
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-7 p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm text-slate-500">Lundi 19 octobre 2026</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Bonjour, bienvenue 👋
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Voici un aperçu de l'activité de votre entreprise.
                </p>
              </div>

              <div className="flex gap-3">
                <button className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">
                  Exporter
                </button>
                <button className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm">
                  + Nouvelle opération
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold ${stat.color}`}>
                      {stat.symbol}
                    </span>
                  </div>
                  <p className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
                    {stat.value}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">{stat.detail}</p>
                    <span className="text-xs font-semibold text-slate-600">{stat.trend}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/70">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-bold">Transactions récentes</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Les derniers mouvements de votre activité
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-indigo-700">
                    4 opérations affichées
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-medium">Description</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Montant</th>
                        <th className="px-5 py-3 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((tx) => (
                        <tr key={tx.name}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${tx.color}`}>
                                {tx.initials}
                              </span>
                              <div>
                                <p className="font-semibold">{tx.name}</p>
                                <p className="mt-1 text-xs text-slate-500">{tx.type}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-500">{tx.date}</td>
                          <td className={`px-4 py-4 font-semibold ${tx.amount.startsWith("+") ? "text-emerald-700" : "text-slate-800"}`}>
                            {tx.amount}
                            <span className="ml-1 text-xs font-normal">FCFA</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">Suivi du budget</h3>
                    <p className="mt-1 text-xs text-slate-500">Dépenses par catégorie</p>
                  </div>
                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    Octobre
                  </span>
                </div>

                <div className="mt-6 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Budget total prévu</p>
                  <p className="mt-2 text-2xl font-bold">2 050 000 FCFA</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full w-[69%] rounded-full bg-indigo-600" />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>1 420 000 FCFA dépensés</span>
                    <span>69 %</span>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {budgets.map((budget) => (
                    <div key={budget.label}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{budget.label}</span>
                        <span className="text-xs text-slate-500">
                          {budget.spent} / {budget.total}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${budget.color}`}
                          style={{ width: budget.width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="rounded-2xl bg-indigo-950 p-6 text-white sm:p-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-indigo-200">
                    VOTRE ESPACE DE TRAVAIL
                  </p>
                  <h3 className="mt-2 text-xl font-bold sm:text-2xl">
                    Une meilleure visibilité sur votre activité.
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                    Centralisez progressivement vos clients, vos opérations,
                    vos budgets et vos ressources au même endroit.
                  </p>
                </div>
                <div className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium">
                  Gestion centralisée · FCFA
                </div>
              </div>
            </div>

            <footer className="pb-3 text-center text-xs text-slate-400">
              GestionPro · Prototype d'interface · Les données affichées sont fictives.
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}