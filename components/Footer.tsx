import SiteSignature from "@/components/SiteSignature";

export default function Footer() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-4 pb-8 pt-10">
      <div className="rounded-[2rem] border border-white/10 bg-black/55 p-5 backdrop-blur-xl">
        <div className="flex flex-col items-center justify-between gap-5 text-center md:flex-row md:text-left">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">Powered by</p>
            <p className="text-lg font-black uppercase tracking-[0.12em] text-white">
              Battle<span className="text-[#b7ef16]">Booking</span>
            </p>
            <p className="mt-1 text-xs font-bold text-zinc-500">v1.1.0</p>
          </div>

          <nav className="flex flex-wrap justify-center gap-3 text-sm font-bold text-zinc-400 md:justify-end">
            <a className="hover:text-[#b7ef16]" href="/terms">Общи условия</a>
            <a className="hover:text-[#b7ef16]" href="/privacy">Поверителност</a>
            <a className="hover:text-[#b7ef16]" href="/cookies">Бисквитки</a>
            <a className="hover:text-[#b7ef16]" href="/contact">Контакти</a>
          </nav>

          <div className="text-sm font-bold leading-7 text-zinc-400">
            <p className="font-black uppercase tracking-[0.18em] text-zinc-500">Контакти:</p>
            <p>Телефон: 0897 047 668</p>
            <p>Email: battlebooking@abv.bg</p>
          </div>
        </div>
      </div>
      <SiteSignature />
    </footer>
  );
}
