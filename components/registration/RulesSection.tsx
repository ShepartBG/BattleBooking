type RulesSectionProps = {
  rulesRead: boolean;
  acceptedRules: boolean;
  onOpenRules: () => void;
  onAcceptedChange: (value: boolean) => void;
};

export default function RulesSection({
  rulesRead,
  acceptedRules,
  onOpenRules,
  onAcceptedChange,
}: RulesSectionProps) {
  return (
    <div className="rounded-2xl border border-lime-400/25 bg-lime-400/10 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-lime-400/20 text-base">
          📄
        </div>

        <div className="flex-1">
          <p className="font-black text-lime-300">Задължителен инструктаж</p>
          <p className="mt-0.5 text-xs leading-5 text-zinc-400">
            Отвори правилата, после чекни приемането.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenRules}
        className="mt-3 w-full rounded-2xl bg-lime-500 p-3 font-black text-black transition hover:bg-lime-400"
      >
        {rulesRead ? "ИНСТРУКТАЖЪТ Е ПРОЧЕТЕН ✅" : "ПРОЧЕТИ ИНСТРУКТАЖА"}
      </button>

      <label className="mt-3 flex items-start gap-3 text-sm text-zinc-300">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-lime-500"
          disabled={!rulesRead}
          checked={acceptedRules}
          onChange={(e) => onAcceptedChange(e.target.checked)}
        />

        <span>
          Прочетох инструктажа и приемам условията.
          {!rulesRead && (
            <span className="block text-xs text-zinc-500">
              Полето се отключва след отваряне на инструктажа.
            </span>
          )}
        </span>
      </label>
    </div>
  );
}
