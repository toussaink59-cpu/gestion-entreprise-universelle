import type {ReactNode} from "react";
import Link from "next/link";
import {localePath} from "@/i18n/locale";
import type {Locale} from "@/i18n/locale";
import {LocaleSwitcher} from "@/components/i18n/locale-switcher";
export function AuthShell({title,description,children,footer,locale,route,copy}:{
title:string;description:string;children:ReactNode;footer:ReactNode;locale:Locale;route:"/login"|"/register"|"/forgot-password"|"/reset-password";
copy:{homeLabel:string;eyebrow:string;headline:string;description:string;footer:string;languageLabel:string};
}){
return <main className="min-h-screen bg-[var(--pg-canvas)]"><div className="mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[minmax(0,0.9fr)_minmax(30rem,1.1fr)]">
<aside className="flex flex-col justify-between border-b border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] px-6 py-7 sm:px-10 sm:py-9 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-14 lg:py-12">
<Link href={localePath(locale, "/login")} aria-label={copy.homeLabel} className="inline-flex w-fit items-center rounded-sm text-xl font-semibold tracking-tight text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--pg-focus)]">PolyGest</Link>
<div className="max-w-md py-8 lg:py-16"><p className="text-sm font-medium text-[var(--pg-accent)]">{copy.eyebrow}</p><h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[var(--pg-text)] sm:text-4xl">{copy.headline}</h2><p className="mt-5 max-w-sm text-base leading-7 text-[var(--pg-text-muted)]">{copy.description}</p></div>
<p className="text-sm text-[var(--pg-text-muted)]">{copy.footer}</p></aside>
<section aria-labelledby="auth-title" className="flex min-h-[32rem] flex-col px-5 py-6 sm:px-10 sm:py-9">
<div className="flex justify-end"><LocaleSwitcher locale={locale} href={route} label={copy.languageLabel}/></div>
<div className="flex flex-1 items-center justify-center py-8"><div className="w-full max-w-md">
<h1 id="auth-title" className="text-2xl font-semibold tracking-tight text-[var(--pg-text)] sm:text-3xl">{title}</h1>
<p className="mt-3 text-sm leading-6 text-[var(--pg-text-muted)]">{description}</p>
<div className="mt-8">{children}</div>
<div className="mt-8 border-t border-[var(--pg-border)] pt-6 text-sm text-[var(--pg-text-muted)]">{footer}</div>
</div></div></section></div></main>;
}
