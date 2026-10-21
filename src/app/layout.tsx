import type { Metadata } from "next";
import "./globals.css";
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
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
