import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Proxy Vault System",
  description: "Upgradable proxy vaults with sequential rule execution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black min-h-screen`} suppressHydrationWarning>
        <Providers>
          <Navbar />
          <main className="min-h-screen p-4 md:p-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
