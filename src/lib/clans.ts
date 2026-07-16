export const NO_CLAN_LABEL = "Konoha";

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
