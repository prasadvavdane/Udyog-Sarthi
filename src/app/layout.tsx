import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VyaparFlow",
  description: "Multi-tenant billing, GST, POS, CRM and analytics platform for India SMBs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetBrainsMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          {children}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              className: 'border border-border bg-card text-card-foreground shadow-xl',
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
