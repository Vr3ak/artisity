// Values must match the public.art_category enum in supabase/schemas/profiles.sql
export const CATEGORIES = [
  { value: "illustration", label: "Illustration" },
  { value: "branding_graphic", label: "Branding & Graphic" },
  { value: "model_3d_2d", label: "3D & 2D Model" },
  { value: "video_animation", label: "Video & Animation" },
  { value: "game_asset", label: "Game Asset" },
  { value: "emote", label: "Emote" },
  { value: "scene_concept_art", label: "Scene & Concept Art" },
  { value: "streaming_asset", label: "Streaming Asset" },
  { value: "writing", label: "Writing" },
  { value: "ui_ux", label: "UI/UX Design" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

export const categoryLabel = (value: string) =>
  CATEGORIES.find((c) => c.value === value)?.label ?? value;

export const PROVINCES = [
  "Phnom Penh",
  "Banteay Meanchey",
  "Battambang",
  "Kampong Cham",
  "Kampong Chhnang",
  "Kampong Speu",
  "Kampong Thom",
  "Kampot",
  "Kandal",
  "Kep",
  "Koh Kong",
  "Kratié",
  "Mondulkiri",
  "Oddar Meanchey",
  "Pailin",
  "Preah Sihanouk",
  "Preah Vihear",
  "Prey Veng",
  "Pursat",
  "Ratanakiri",
  "Siem Reap",
  "Stung Treng",
  "Svay Rieng",
  "Takéo",
  "Tbong Khmum",
];

export const BUSINESS_TYPES = [
  "Restaurant & Café",
  "Retail & Shop",
  "Hotel & Tourism",
  "Beauty & Wellness",
  "Startup & Tech",
  "Education",
  "NGO",
  "Events & Weddings",
  "Other",
];

// Must match the services.currency check constraint
export const CURRENCIES = ["USD", "KHR"] as const;
export type Currency = (typeof CURRENCIES)[number];
