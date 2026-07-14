import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-loaded" });

export const metadata: Metadata = {
  title: "Voxa Dashboard",
  description: "Voxa multi-tenant client & admin dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning on <html> and <body>: browser extensions
    // (password managers, ColorZilla's `cz-shortcut-listen`, Grammarly, etc.)
    // inject attributes onto these top-level elements before React hydrates.
    // That made the server HTML and client DOM differ, and the resulting
    // hydration mismatch forced React to throw away the server render and
    // re-render everything on the client — which, with the hero canvas, showed
    // up as the dashboard "hanging/spinning on load". This flag tells React to
    // ignore attribute differences on just these two elements (it does NOT
    // suppress warnings for the rest of the tree).
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${jetbrainsMono.variable}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
