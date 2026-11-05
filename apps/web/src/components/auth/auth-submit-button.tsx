 "use client";
import {useFormStatus} from "react-dom";
export function AuthSubmitButton({label,pendingLabel="Processing…"}:{label:string;pendingLabel?:string}){
const {pending}=useFormStatus();
return <button type="submit" disabled={pending} aria-disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[var(--pg-accent)] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[var(--pg-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pg-focus)] disabled:cursor-wait disabled:opacity-70">{pending?pendingLabel:label}</button>;
}
