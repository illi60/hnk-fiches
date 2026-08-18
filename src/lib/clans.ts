export const NO_CLAN_LABEL = "Konoha";
export const FOUNDER_CLAN_KEYS = ["hyuga", "sarutobi", "senju", "uchiha", "uzumaki"] as const;
export const MINOR_CLAN_KEYS = ["shiranui"] as const;

export function normalizeClanKey(clan?: string | null): string {
  return (clan ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isNoClan(clan?: string | null): boolean {
  return normalizeClanKey(clan) === "konoha";
}

export function playableClanKey(clan?: string | null): string | null {
  const key = normalizeClanKey(clan);
  return key && key !== "konoha" ? key : null;
}

export function hasPlayableClan(clan?: string | null): boolean {
  return playableClanKey(clan) !== null;
}

export function isFounderClan(clan?: string | null): boolean {
  const key = playableClanKey(clan);
  return !!key && (FOUNDER_CLAN_KEYS as readonly string[]).includes(key);
}

export function isMinorClan(clan?: string | null): boolean {
  const key = playableClanKey(clan);
  if (!key) return false;
  return (MINOR_CLAN_KEYS as readonly string[]).includes(key) || !isFounderClan(key);
}

export function clanStatusLabel(clan?: string | null): string | null {
  if (!playableClanKey(clan)) return null;
  return isMinorClan(clan) ? "Clan mineur" : "Clan fondateur";
}
