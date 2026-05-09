import type { Metadata } from "next"
import { Syne, DM_Sans, DM_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

/** Display / brand headings — geometric, distinctive, premium */
const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

/** UI body — warm, rounded, highly legible at small sizes */
const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

/** Monospace — coordinates, code, spectral values */
const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

export const metadata: Metadata = {
  title: "ForestIA — Gestão Florestal Inteligente",
  description: "Plataforma de gestão florestal, monitoramento geoespacial e relatórios de viabilidade",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${syne.variable} ${dmSans.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="h-full font-sans">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
