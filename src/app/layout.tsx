import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Screen Recording POC",
  description: "Screen capture proof of concept using getDisplayMedia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
