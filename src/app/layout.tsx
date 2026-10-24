import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import "./workspace.css";
import "./spatial.css";
import "./enhancement.css";
import "./data-management.css";
import "./intelligence.css";
import "./overview.css";
const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-kanit",
});
export const metadata: Metadata = {
  title: "RetailVerse 3D — Smart Store Digital Twin",
  description:
    "RSIP portfolio · synthetic retail data and an approximate 3D floor plan.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={kanit.variable}>
      <body>{children}</body>
    </html>
  );
}
