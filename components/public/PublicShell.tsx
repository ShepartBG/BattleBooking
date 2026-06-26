import { ReactNode } from "react";
import PublicNav from "@/components/public/PublicNav";
import Footer from "@/components/Footer";

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <main className="bb-page-bg min-h-screen text-white">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(123,143,42,0.20),transparent_34%),linear-gradient(to_bottom,rgba(0,0,0,0.18),rgba(0,0,0,0.72))]">
        <PublicNav />
        {children}
        <Footer />
      </div>
    </main>
  );
}
