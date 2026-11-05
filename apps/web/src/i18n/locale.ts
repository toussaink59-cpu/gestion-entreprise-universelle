export const locales=["fr","en"] as const;
export type Locale=(typeof locales)[number];
export function isLocale(v:string|null|undefined):v is Locale{return v==="fr"||v==="en";}
export function localeFrom(v:string|null|undefined):Locale{return isLocale(v)?v:"fr";}
export function localePath(l:Locale,p:string){const n=p.startsWith("/")?p:"/"+p;return l==="fr"?n:(n==="/"?"/en":"/en"+n);}
export function postAuthDestination(l:Locale,p:string){if(l==="fr")return p;if(p==="/onboarding"||p.startsWith("/onboarding?"))return localePath("en",p);return localePath("en","/workspace-language-notice")+"?continue="+encodeURIComponent(p);}
