import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { isLocale, localeFrom } from "./locale";
import fr from "../messages/fr.json";
import en from "../messages/en.json";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get("x-polygest-locale");
  const requested = headerLocale ?? (await requestLocale);
  const locale = isLocale(requested) ? localeFrom(requested) : "fr";
  return { locale, messages: locale === "en" ? en : fr };
});
