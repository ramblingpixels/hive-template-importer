import type { Metadata } from "next";

import { AppHeader } from "@/components/app-header";

import "./globals.css";

export const metadata: Metadata = {
  title: "Hive Template Studio",
  description: "Trustworthy Spectora template imports for home inspectors.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppHeader />
        <main>{children}</main>
        <footer className="site-footer">
          <span>Hive Template Studio</span>
          <span>Every source value is either mapped, preserved, or explained.</span>
        </footer>
      </body>
    </html>
  );
}

