export interface UserProfile {
  id: string;
  name: string;
  /** Short epithet shown on the quest panel, e.g. "Kaptan". */
  title: string;
  createdAt: number;
}

export type IslandId = "lotus" | "cave-farm";

export interface SessionChoice {
  profile: UserProfile;
  island: IslandId;
}

const PROFILE_KEY = "lotophagoi.profile.v1";

export function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as UserProfile;
    if (!p?.id || !p?.name?.trim()) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
}

export function createProfile(name: string, title: string): UserProfile {
  const profile: UserProfile = {
    id: crypto.randomUUID(),
    name: name.trim(),
    title: title.trim() || "Denizci",
    createdAt: Date.now(),
  };
  saveProfile(profile);
  return profile;
}

export const ISLANDS: Array<{
  id: IslandId;
  name: string;
  tagline: string;
  available: boolean;
}> = [
  {
    id: "lotus",
    name: "Lotus Adası",
    tagline: "On iki gemi, on iki çiçek — güneş batmadan.",
    available: true,
  },
  {
    id: "cave-farm",
    name: "Kristal Mağara",
    tagline: "Glowsprig çiftlik varyantı — yakında.",
    available: false,
  },
];
