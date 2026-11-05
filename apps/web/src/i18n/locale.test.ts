import {describe,expect,it} from "vitest";
import {isLocale,localeFrom,localePath,postAuthDestination} from "./locale";
describe("locale routing",()=>{
it("accepts only fr and en",()=>{expect(isLocale("fr")).toBe(true);expect(isLocale("en")).toBe(true);expect(isLocale("fr-BF")).toBe(false);expect(localeFrom("de")).toBe("fr");});
it("keeps French unprefixed and prefixes English",()=>{expect(localePath("fr","/login")).toBe("/login");expect(localePath("en","/login")).toBe("/en/login");});
it("localizes onboarding but warns before untranslated workspace",()=>{expect(postAuthDestination("en","/onboarding")).toBe("/en/onboarding");expect(postAuthDestination("en","/dashboard")).toBe("/en/workspace-language-notice?continue=%2Fdashboard");});
});
