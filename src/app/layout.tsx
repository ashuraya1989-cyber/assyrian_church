import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: "Kyrkoregistret",
  description: "Digitalt medlemsregistersystem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={cn(geist.variable)}>
      <body className={cn("font-sans antialiased bg-background text-foreground")}>
        {children}
      </body>
    </html>
  );
}
