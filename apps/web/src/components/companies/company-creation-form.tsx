import type {Locale} from "@/i18n/locale";
type CompanyCreationAction=(formData:FormData)=>void|Promise<void>;
const INPUT="mt-2 block min-h-11 w-full rounded-md border border-[var(--pg-control-border)] bg-[var(--pg-surface)] px-3 py-2.5 text-base text-[var(--pg-text)] outline-none focus-visible:border-[var(--pg-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";
const BUTTON="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--pg-accent)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)]";
export function CompanyCreationForm({action,submitLabel,locale="fr",labels}:{
action:CompanyCreationAction;submitLabel:string;locale?:Locale;
labels?:{legalName:string;legalPlaceholder:string;tradeName:string;optional:string;tradePlaceholder:string};
}){
const x=labels??{legalName:"Raison sociale *",legalPlaceholder:"Nom l√©gal de l‚Äôentreprise",tradeName:"Nom commercial",optional:"(facultatif)",tradePlaceholder:"Nom utilis√© aupr√®s de tes clients"};
return <form action={action} className="space-y-5"><input type="hidden" name="locale" value={locale}/>
<div><label htmlFor="company-legal-name" className="block text-sm font-semibold text-[var(--pg-text)]">{x.legalName}</label><input id="company-legal-name" className={INPUT} name="legal_name" type="text" aut∂ªßq´^