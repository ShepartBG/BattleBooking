import { ReactNode } from "react";
import PublicShell from "@/components/public/PublicShell";

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="rounded-[2.4rem] border border-white/10 bg-black/60 p-8 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
            About BattleBooking
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">
            Какво е BattleBooking?
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-zinc-300">
            BattleBooking е SaaS платформа за организиране на airsoft игрища.
            Мислим я като Booking.com / FACEIT / Battle.net за airsoft: място,
            където играчите намират битки, а организаторите управляват процеса
            професионално.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Panel title="Проблемът">
            Анкети, чатове, ръчни списъци, трол регистрации, объркани комплекти
            под наем и липса на ясна информация за играчите.
          </Panel>
          <Panel title="Решението">
            Един dashboard за игри, регистрации, правила, статус, комплекти,
            линкове за записване и бъдещ QR check-in.
          </Panel>
          <Panel title="За организатори">
            Създаваш игра, задаваш дата, час, място, комплекти под наем и
            правила. Получаваш линк, който изпращаш към играчите.
          </Panel>
          <Panel title="За играчи">
            Влизаш в линка, виждаш информацията, четеш инструктажа и се записваш
            за секунди.
          </Panel>
          <Panel title="SaaS модел">
            Free Trial → Pending Approval → Active Subscription. По-късно:
            Stripe, PayPal, банков превод и абонамент за организатори.
          </Panel>
          <Panel title="Anti-troll посока">
            Регистрацията първо ще бъде pending. Играчът ще потвърждава чрез SMS,
            Viber, magic link или BattleBooking Account. След това става active.
          </Panel>
        </div>
      </section>
    </PublicShell>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
      <h2 className="text-2xl font-black text-[#b7ef16]">{title}</h2>
      <p className="mt-4 leading-7 text-zinc-300">{children}</p>
    </div>
  );
}
