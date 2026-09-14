import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito, Patrick_Hand } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { getBrandSafe } from "@/lib/brand";
import { ilgi } from "@/lib/turkce";

const baloo = Baloo_2({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700", "800"], variable: "--font-baloo" });
const nunito = Nunito({ subsets: ["latin", "latin-ext"], weight: ["400", "600", "700"], variable: "--font-nunito" });
const patrick = Patrick_Hand({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-patrick" });

/**
 * Sayfa adi veritabanindan gelir (her aile kendi adini koyar).
 * getBrandSafe ASLA firlatmaz: Deploy Button'in ilk build'inde veritabani bos
 * olabilir, firlatirsa build coker ve aile hicbir sey goremez.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { childName, siteName } = await getBrandSafe();
  return {
  title: { default: siteName, template: `%s · ${siteName}` },
  description: childName
    ? `${ilgi(childName)} sözleri, fotoğrafları ve ilkleri. Sadece aile için.`
    : "Bir çocuğun sözleri, fotoğrafları ve ilkleri. Sadece aile için.",
  applicationName: siteName,
  appleWebApp: { capable: true, statusBarStyle: "default", title: siteName },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  // Cocuk verisi: arama motorlarina kapali.
  robots: { index: false, follow: false, nocache: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#eaf3fa",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

// Sayfa boyanmadan once kayitli temayi uygular; yoksa once acik cizilip geceye "atlar".
const THEME_INIT = `try{var t=localStorage.getItem("adaland-theme");if(t==="rose"||t==="lavender"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${baloo.variable} ${nunito.variable} ${patrick.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
