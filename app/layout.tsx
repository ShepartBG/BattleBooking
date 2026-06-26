import type { Metadata } from "next";
import FloatingHomeButton from "@/components/brand/FloatingHomeButton";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "BattleBooking.bg",
  description:
    "Система за airsoft игрища, активни игри, регистрации, комплекти под наем, декларации и админ управление.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-battlebooking.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon-battlebooking.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg" className="h-full antialiased">
      <body className="min-h-full bg-black text-white">
        {children}
        <FloatingHomeButton />
      </body>
    </html>
  );
}
