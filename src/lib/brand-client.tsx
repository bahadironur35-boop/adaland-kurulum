"use client";

import { createContext, useContext } from "react";
import { ilgi, yonelme, belirtme, bulunma } from "./turkce";

/**
 * Cocugun ve sayfanin adi istemci bilesenlerine buradan gecer.
 * 15 bilesene tek tek prop gecirmek yerine baglam: montaj noktasi yalnizca dort
 * (app layout, giris, sifre-belirle, p/[token]).
 */
export type BrandValue = { childName: string; siteName: string };

const Ctx = createContext<BrandValue | null>(null);

export function BrandProvider({ value, children }: { value: BrandValue; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Ad + hazir cekimler. Metinlerde `${b.cocuk.ilgi} sözleri` gibi kullanilir. */
export function useBrand() {
  const v = useContext(Ctx);
  if (!v) throw new Error("BrandProvider yok: bu bileşen sağlayıcının içinde render edilmeli.");
  return {
    site: v.siteName,
    siteBulunma: bulunma(v.siteName),
    siteYonelme: yonelme(v.siteName),
    siteBelirtme: belirtme(v.siteName),
    ad: v.childName,
    adIlgi: ilgi(v.childName),
    adYonelme: yonelme(v.childName),
    adBelirtme: belirtme(v.childName),
  };
}
