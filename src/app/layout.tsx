import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
// import "./bloomberg-dark.css";
import ClientProvider from "@/components/providers/clientProvider";
import { ThemeProvider } from "@/infrastructure/theme/ThemeContext";
import AuthGuard from "@/components/providers/AuthGuard";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Crypto Trading Platform",
  description: "Professional cryptocurrency trading platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetBrainsMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <ClientProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </ClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}