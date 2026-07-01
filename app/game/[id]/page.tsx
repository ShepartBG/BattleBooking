"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Hero from "@/components/Hero";
import StatsCards from "@/components/StatsCards";
import RegistrationForm from "@/components/registration/RegistrationForm";
import LiveInfoPanel from "@/components/home/LiveInfoPanel";
import SuccessScreen from "@/components/home/SuccessScreen";
import HomeLoader from "@/components/home/HomeLoader";
import NoActiveGame from "@/components/home/NoActiveGame";
import RulesModal from "@/components/home/RulesModal";
import PublicShell from "@/components/public/PublicShell";
import { useFieldSettings } from "@/lib/useFieldSettings";
import { isGameStillPublic } from "@/lib/gameVisibility";

const DAILY_BROWSER_REGISTRATION_MS = 24 * 60 * 60 * 1000;

type Game = {
  id: string;
  title: string;
  game_date: string;
  game_time: string;
  location: string;
  max_rental_sets: number;
  rules_text: string;
  rules_version: string;
  status: string;
  postponed_reason?: string | null;
  field_id?: string | null;
};

function getDailyRegistrationKey(gameId: string) {
  return `battlebooking-game-registration-${gameId}`;
}

function hasRecentBrowserRegistration(gameId: string) {
  try {
    const raw = localStorage.getItem(getDailyRegistrationKey(gameId));
    if (!raw) return false;
    const createdAt = Number(raw);
    return Date.now() - createdAt < DAILY_BROWSER_REGISTRATION_MS;
  } catch {
    return false;
  }
}

function saveBrowserRegistration(gameId: string) {
  try {
    localStorage.setItem(getDailyRegistrationKey(gameId), String(Date.now()));
  } catch {
    // localStorage може да е забранен. Не блокираме успешната регистрация.
  }
}

export default function PublicGamePage() {
  const params = useParams();
  const gameId = params.id as string;

  const [successCode, setSuccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [rentalPlayers, setRentalPlayers] = useState(0);
  const [game, setGame] = useState<Game | null>(null);
  const [gameLoading, setGameLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [rulesRead, setRulesRead] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const fieldSettings = useFieldSettings(game?.field_id);

  const freeRentalSets = (game?.max_rental_sets ?? 0) - rentalPlayers;
  const ownPlayers = totalPlayers - rentalPlayers;

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("bg-BG", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  async function loadGame() {
    setGameLoading(true);

    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .maybeSingle();

    if (error) {
      alert("Грешка при зареждане на играта: " + error.message);
      setGameLoading(false);
      return;
    }

    setGame(data ?? null);
    setGameLoading(false);
  }

  async function loadStats(id: string) {
    const { data, error } = await supabase
      .from("registrations")
      .select("participation_type")
      .eq("game_id", id)
      .eq("status", "active");

    if (error) return alert("Грешка при зареждане на статистиката.");

    setTotalPlayers(data.length);
    setRentalPlayers(
      data.filter((item) => item.participation_type === "rental").length,
    );
  }

  useEffect(() => {
    if (gameId) loadGame();
  }, [gameId]);

  useEffect(() => {
    if (game?.id) loadStats(game.id);
  }, [game]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!game) return alert("В момента няма активна игра за записване.");
    if (game.status !== "active")
      return alert("Регистрацията за тази игра е затворена.");
    if (!rulesRead || !acceptedRules)
      return alert("Първо прочетете правилата и приемете условията.");

    if (hasRecentBrowserRegistration(game.id)) {
      return alert(
        "От този браузър вече има направена регистрация за тази игра през последните 24 часа. Ако смятате, че това е грешка, свържете се с организатора.",
      );
    }

    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const participationType = String(formData.get("participation_type"));
    const phone = String(formData.get("phone")).trim();

    if (participationType === "rental" && freeRentalSets <= 0) {
      setLoading(false);
      return alert("Всички комплекти под наем са резервирани.");
    }

    const { data: existingPhones, error: phoneCheckError } = await supabase
      .from("registrations")
      .select("id")
      .eq("game_id", game.id)
      .eq("phone", phone)
      .eq("status", "active");

    if (phoneCheckError) {
      setLoading(false);
      return alert("Грешка при проверка на телефона.");
    }

    if (existingPhones && existingPhones.length > 0) {
      setLoading(false);
      return alert("Този телефон вече е записан за тази игра.");
    }

    const code = "BB" + Math.floor(1000 + Math.random() * 9000);

    const { error } = await supabase.from("registrations").insert({
      game_id: game.id,
      first_name: formData.get("first_name"),
      last_name: formData.get("last_name"),
      phone,
      age: Number(formData.get("age")),
      participation_type: participationType,
      registration_code: code,
      declaration_accepted: true,
      declaration_text: game.rules_text,
      declaration_accepted_at: new Date().toISOString(),
      rules_version: game.rules_version,
      status: "active",
    });

    setLoading(false);

    if (error) return alert("Грешка при записване: " + error.message);

    saveBrowserRegistration(game.id);
    await loadStats(game.id);
    setSuccessCode(code);
  }

  if (successCode) {
    return (
      <PublicShell>
        <SuccessScreen
          code={successCode}
          fieldName={fieldSettings.name}
          fieldLogo={fieldSettings.logoUrl}
          logoFit={fieldSettings.logoFit}
          logoScale={fieldSettings.logoScale}
          logoX={fieldSettings.logoX}
          logoY={fieldSettings.logoY}
        />
      </PublicShell>
    );
  }

  if (gameLoading) {
    return (
      <PublicShell>
        <HomeLoader />
      </PublicShell>
    );
  }

  if (!game) {
    return (
      <PublicShell>
        <NoActiveGame />
      </PublicShell>
    );
  }

  const isPostponed = game.status === "postponed";

  if (!isGameStillPublic(game)) {
    return (
      <PublicShell>
        <NoActiveGame />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-6xl space-y-4 px-3 py-5 md:px-5">
        <Hero
          title={game.title}
          date={formatDate(game.game_date)}
          time={game.game_time?.slice(0, 5)}
          location={game.location}
          description={null}
          fieldName={fieldSettings.name}
          fieldLogo={fieldSettings.logoUrl}
          backgroundUrl={fieldSettings.backgroundUrl}
          phone={fieldSettings.phone}
          facebook={fieldSettings.facebook}
          instagram={fieldSettings.instagram}
          tiktok={fieldSettings.tiktok}
          logoFit={fieldSettings.logoFit}
            logoScale={fieldSettings.logoScale}
            logoX={fieldSettings.logoX}
            logoY={fieldSettings.logoY}
        />

        {isPostponed ? (
          <PostponedGameNotice
            reason={game.postponed_reason}
            phone={fieldSettings.phone}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.45fr_0.9fr] lg:items-start">
            <RegistrationForm
              loading={loading}
              freeRentalSets={freeRentalSets}
              rulesRead={rulesRead}
              acceptedRules={acceptedRules}
              onSubmit={handleSubmit}
              onOpenRules={() => setShowRules(true)}
              onAcceptedRulesChange={setAcceptedRules}
            />

            <LiveInfoPanel
              totalPlayers={totalPlayers}
              rentalPlayers={rentalPlayers}
              ownPlayers={ownPlayers}
              freeRentalSets={freeRentalSets}
              location={game.location}
              ownPrice={fieldSettings.ownPrice}
              rentalPrice={fieldSettings.rentalPrice}
              phone={fieldSettings.phone}
            />
          </div>
        )}

        <StatsCards
          totalPlayers={totalPlayers}
          rentalPlayers={rentalPlayers}
          ownPlayers={ownPlayers}
          freeRentalSets={freeRentalSets}
        />

        <div className="pb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500 transition hover:border-lime-400/30 hover:text-lime-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400/70" />
            Powered by BattleBooking.bg
          </Link>
        </div>

        {showRules && (
          <RulesModal
            rulesText={game.rules_text}
            onConfirm={() => {
              setRulesRead(true);
              setShowRules(false);
            }}
          />
        )}
      </div>
    </PublicShell>
  );
}


function PostponedGameNotice({
  reason,
  phone,
}: {
  reason?: string | null;
  phone?: string;
}) {
  const finalReason =
    reason?.trim() || "Играта се отлага поради организационни причини.";

  return (
    <section className="rounded-[2rem] border-2 border-red-500/45 bg-red-950/40 p-6 text-center shadow-[0_0_60px_rgba(239,68,68,0.20)] backdrop-blur-xl md:p-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-5xl font-black uppercase leading-none text-red-500 md:text-7xl">
          🚨 ИГРАТА СЕ ОТЛАГА
        </p>

        <div className="mt-6 rounded-[1.5rem] border border-red-400/30 bg-black/45 p-5">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">
            Причина
          </p>
          <p className="mt-3 text-xl font-black text-white">{finalReason}</p>
        </div>

        <p className="mt-6 text-lg leading-8 text-zinc-200">
          За повече информация се свържете с организатора на посочения телефон.
        </p>

        {phone ? (
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="mt-5 inline-flex rounded-2xl bg-red-600 px-7 py-4 text-xl font-black text-white transition hover:bg-red-500"
          >
            📞 {phone}
          </a>
        ) : (
          <p className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4 font-bold text-zinc-300">
            Телефонът на организатора ще бъде обявен допълнително.
          </p>
        )}
      </div>
    </section>
  );
}
