export type FieldSettings = {
  name: string;
  slug: string;
  region: string;
  settlement: string;
  location: string;
  description: string;
  logoUrl: string;
  logoFit: "contain" | "cover";
  logoScale: number;
  logoX: number;
  logoY: number;
  backgroundUrl: string;
  ownPrice: string;
  rentalPrice: string;
  phone: string;
  facebook: string;
  instagram: string;
  tiktok: string;
};

export const DEFAULT_FIELD_SETTINGS: FieldSettings = {
  name: "BattleBooking Arena",
  slug: "arena",
  region: "",
  settlement: "",
  location: "Локацията ще бъде добавена от организатора.",
  description:
    "Профилът на това игрище все още се настройва. Организаторът може да добави собствено лого, фон, описание, цени и социални мрежи от Настройки.",
  logoUrl: "/battlebooking-real-logo-transparent.png",
  logoFit: "contain",
  logoScale: 1,
  logoX: 0,
  logoY: 0,
  backgroundUrl: "/battlebooking-bg.jpg",
  ownPrice: "",
  rentalPrice: "",
  phone: "",
  facebook: "",
  instagram: "",
  tiktok: "",
};

export const FIELD_SETTINGS_STORAGE_KEY = "battlebooking-field-settings-v65";
