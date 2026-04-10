import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from '@/components/SiteHeader'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Toaster } from '@/components/ui/toaster'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hopeful Monsters",
  description: "Hopeful Monsters platform for tool access and approvals",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans antialiased">
        <ErrorBoundary>
          <ThemeProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <Toaster />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
