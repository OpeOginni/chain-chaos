import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner"
import { ThirdwebProvider } from "thirdweb/react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });
export const metadata: Metadata = {
  title: "ChainChaos",
  description: "A decentralized prediction market on Etherlink.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ThirdwebProvider>
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <Header />
              <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8">
                {children}
              </main>
            <Footer />
        </div>
          <Toaster />
        </ThirdwebProvider>
      </body>
    </html>
  );
}
