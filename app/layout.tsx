import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Archive — your fits",
  description: "A private, personal archive of your outfits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
