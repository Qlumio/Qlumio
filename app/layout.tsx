import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/userContext";
import ThemeProvider from "@/components/ThemeProvider";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Qlumio",
  description: "Family operating system",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Qlumio",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/icon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider />
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
