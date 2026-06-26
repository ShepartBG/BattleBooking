"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import RegistrationFields from "./RegistrationFields";
import ParticipationSelect from "./ParticipationSelect";
import RulesSection from "./RulesSection";
import SubmitButton from "./SubmitButton";
import {
  RegistrationErrors,
  validateRegistrationForm,
  hasRegistrationErrors,
} from "@/utils/validators";

type Props = {
  loading: boolean;
  freeRentalSets: number;
  rulesRead: boolean;
  acceptedRules: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onOpenRules: () => void;
  onAcceptedRulesChange: (value: boolean) => void;
};

export default function RegistrationForm({
  loading,
  freeRentalSets,
  rulesRead,
  acceptedRules,
  onSubmit,
  onOpenRules,
  onAcceptedRulesChange,
}: Props) {
  const [errors, setErrors] = useState<RegistrationErrors>({});

  function handleLocalSubmit(e: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    const validationErrors = validateRegistrationForm(formData);

    setErrors(validationErrors);

    if (hasRegistrationErrors(validationErrors)) {
      e.preventDefault();
      return;
    }

    onSubmit(e);
  }

  return (
    <Card className="space-y-3 p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-300">
            Registration
          </p>
          <h2 className="mt-1 text-3xl font-black tracking-tight">
            Запиши се
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Попълни данните, прочети инструктажа и запази кода.
          </p>
          <p className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-xs font-bold leading-5 text-yellow-100">
            ⚠️ Важно: При невалиден телефонен номер регистрацията няма да се счита за запазена. Организаторът може да използва телефона за потвърждение при нужда.
          </p>
        </div>

        <div className="hidden rounded-2xl border border-lime-400/20 bg-lime-400/10 px-4 py-3 text-center sm:block">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Свободни
          </p>
          <p className="text-3xl font-black text-lime-300">{freeRentalSets}</p>
        </div>
      </div>

      <form noValidate onSubmit={handleLocalSubmit} className="space-y-3">
        <RegistrationFields errors={errors} />
        <ParticipationSelect freeRentalSets={freeRentalSets} errors={errors} />
        <RulesSection
          rulesRead={rulesRead}
          acceptedRules={acceptedRules}
          onOpenRules={onOpenRules}
          onAcceptedChange={onAcceptedRulesChange}
        />
        <SubmitButton
          loading={loading}
          disabled={!rulesRead || !acceptedRules}
        />
      </form>
    </Card>
  );
}
