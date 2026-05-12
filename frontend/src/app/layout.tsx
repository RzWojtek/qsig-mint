import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QSIG — Quantum Signature Daily Mint",
  description: "Daily mint gated by SPHINCS- post-quantum signature. 500 QSIG per day for 0.0005 ETH.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black">{children}</body>
    </html>
  );
}
