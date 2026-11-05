import type {ReactNode} from "react";
import Link from "next/link";
import {localePath} from "@/i18n/locale";
import type {Locale} from "@/i18n/locale";
import {LocaleSwitcher} from "@/components/i18n/locale-switcher";
export function AuthShell({title,description,children,footer,locale,route,copy}:{
title:string;description:string;children:ReactNode;footer:ReactNode;locale:Locale;route:"/login"|"/register";
copy:{homeLabel:string;eyebrow:string;headline:string;description:string;footer:string;languageLabel:string};
}){
return <main className="min-h-screen bg-[var(--pg-canvas)]"><div className="mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[minmax(0,0.9fr)_minmax(30rem,1.1fr)]">
<aside className="flex flex-col justify-between border-b border-[var(--pg-border)] bg-[var(--pg-surface-subtle)] px-6 py-7 sm:px-10 sm:py-9 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-14 lg:py-12">
<Link href={localePath(locale, "/login")} aria-label={copy.homeLabel} className="inline-flex w-fit items-center rounded-sm text-xl font-semibold tracking-tight text-[var(--pg-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--pg-focus)]">PolyGest</Link>
<div className="max-w-md py-8 lg:py-16"><p className="text-sm font-medium text-[var(--pg-accent)]">{copy.eyebrow}</p><h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[var(--pg-text)] sm:text-4xl">{copy.headline}</h2><p className="mt-5 max-w-sm text-base lea¶»§q«^