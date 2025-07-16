import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "ChainChaos - Etherlink Prediction Markets",
  description: "The ultimate prediction market platform built on Etherlink. Make predictions on blockchain metrics and win big with XTZ and USDC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
