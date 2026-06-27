import { ReactNode } from "react";
import PublicShell from "@/components/public/PublicShell";

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4 sm:py-12">
        <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-black/60 p-5 sm:rounded-[2.4rem] sm:p-8 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
            BattleBooking
          </p>
          <h1 className="bb-mobile-title mt-3 text-[2.35rem] font-black leading-[0.98] tracking-tight sm:text-5xl md:text-7xl">
            Какво е BattleBooking?
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
            BattleBooking е система за организиране на airsoft игри, създадена
            да замени хаотичните записвания в чатове, анкети и ръчни списъци.
            Играчите виждат активните игри и се записват бързо, а организаторите
            управляват участниците, комплектите под наем, правилата и статуса на
            всяка игра от едно място.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:mt-8 sm:gap-5 md:grid-cols-2">
          <Panel title="Проблемът">
            При стандартната организация информацията често се губи между
            чатове, анкети и лични съобщения. Това води до дублирани записвания,
            грешки при комплектите под наем и неясен списък с участници.
          </Panel>
          <Panel title="Решението">
            BattleBooking събира най-важното в един подреден dashboard: активни
            игри, записани участници, свободни комплекти под наем, правила,
            статус на регистрацията и отделен линк за всяка игра.
          </Panel>
          <Panel title="За организатори">
            Създаваш игра, задаваш дата, час, място, капацитет на екипировката и
            правила. След това изпращаш линка към играчите и следиш записванията
            в реално време.
          </Panel>
          <Panel title="За играчи">
            Играчът отваря линка, вижда информацията за играта, избира участие
            със собствена или наета екипировка, приема правилата и получава код
            за потвърждение.
          </Panel>
          <Panel title="Достъп за организатори">
            Подава се заявка за достъп, BattleBooking преглежда данните и след
            одобрение организаторът получава собствен профил за управление на
            своето игрище. Първият месец е безплатен тестов достъп, за да се
            провери дали системата е удобна за реалната работа на терен.
          </Panel>
          <Panel title="Контрол на записванията">
            Системата проверява телефон, възраст, свободни комплекти под наем,
            статус на играта и последна регистрация от браузъра, за да намали
            дублирани, объркани или невалидни записвания.
          </Panel>
        </div>
      </section>
    </PublicShell>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/60 p-4 sm:rounded-[2rem] sm:p-6 backdrop-blur-xl">
      <h2 className="text-xl font-black text-[#b7ef16] sm:text-2xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-300 sm:mt-4 sm:text-base sm:leading-7">{children}</p>
    </div>
  );
}
