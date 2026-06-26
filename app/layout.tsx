import type { Metadata } from "next";
import FloatingHomeButton from "@/components/brand/FloatingHomeButton";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "BattleBooking | Airsoft Platform",
  description:
    "Платформа за airsoft игрища, активни игри, регистрации, комплекти под наем, декларации и админ управление.",
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
