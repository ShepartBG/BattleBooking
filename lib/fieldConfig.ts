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
  name: "Airsoft Field Warzone",
  slug: "warzone",
  region: "Враца",
  settlement: "с. Бутан",
  location: "с. Бутан, област Враца",
  description:
    "Първото реално игрище в BattleBooking. Активни airsoft сценарии, комплекти под наем, правила и регистрация през платформата.",
  logoUrl: "/warzone-logo.png",
  logoFit: "contain",
  logoScale: 1,
  logoX: 0,
  logoY: 0,
  backgroundUrl: "/warzone-bg.jpg",
  ownPrice: "10€",
  rentalPrice: "25€",
  phone: "0897047668",
  facebook: "",
  instagram: "",
  tiktok: "",
};

export const FIELD_SETTINGS_STORAGE_KEY = "battlebooking-field-settings-v64";
