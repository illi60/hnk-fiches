export const CHARACTER_STATUSES = ["ACTIVE", "DEAD_MISSING"] as const;

export type CharacterStatus = (typeof CHARACTER_STATUSES)[number];

export const CHARACTER_STATUS_LABEL: Record<CharacterStatus, string> = {
  ACTIVE: "Actif",
  DEAD_MISSING: "Mort / Disparu",
};

export function isFrozenCharacter(status?: string | null) {
  return status === "DEAD_MISSING";
}
