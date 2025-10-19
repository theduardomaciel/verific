import { pgEnum } from "drizzle-orm/pg-core";

export const discoveryOptions = [
    "instagram",
    "facebook",
    "twitter",
    "tiktok",
    "linkedin",
    "friends",
    "family",
    "event",
    "online_ad",
    "search_engine",
    "other",
] as const;

export const discoveryEnum = pgEnum("discovery", discoveryOptions);

export const discoveryLabels = {
    instagram: "Instagram",
    facebook: "Facebook",
    twitter: "Twitter / X",
    tiktok: "TikTok",
    linkedin: "LinkedIn",
    friends: "Amigos",
    family: "Família",
    event: "Evento",
    online_ad: "Anúncio online",
    search_engine: "Mecanismo de busca",
    other: "Outro",
} as const;

export type Discovery = (typeof discoveryOptions)[number];

export const getDiscoveryLabel = (value: Discovery) => discoveryLabels[value];
