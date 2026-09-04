export const SPECIAL_UNIT_NAMES = ["Shikei", "Chowa", "Joheki", "Ningen"] as const;
export const KINJUTSU_UNIT_UNLOCK_GRADE = "CHUNIN";

const GRADE_ORDER = ["GENIN", "CHUNIN", "JONIN"] as const;

type Grade = (typeof GRADE_ORDER)[number];

function comparableUnitName(unit: string): string {
  return unit
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeSpecialUnit(unit?: string | null): string | null {
  const raw = unit?.trim();
  if (!raw) return null;
  const comparable = comparableUnitName(raw);
  const known = SPECIAL_UNIT_NAMES.find((name) => comparableUnitName(name) === comparable);
  return known ?? raw;
}

export function unitKinjutsuScope(unit?: string | null): string | null {
  const normalized = normalizeSpecialUnit(unit);
  return normalized ? `UNIT:${normalized}` : null;
}

export function unitFromKinjutsuScope(scope?: string | null): string | null {
  if (!scope?.startsWith("UNIT:")) return null;
  return normalizeSpecialUnit(scope.slice(5));
}

function gradeIndex(grade?: string | null): number {
  return GRADE_ORDER.indexOf((grade ?? "GENIN").toUpperCase() as Grade);
}

export function hasKinjutsuUnitGrade(grade?: string | null): boolean {
  return gradeIndex(grade) >= gradeIndex(KINJUTSU_UNIT_UNLOCK_GRADE);
}

export function canAccessUnitKinjutsu({
  scope,
  viewerUnit,
  viewerGrade,
}: {
  scope?: string | null;
  viewerUnit?: string | null;
  viewerGrade?: string | null;
}): boolean {
  const scopeUnit = unitFromKinjutsuScope(scope);
  if (!scopeUnit) return false;
  return (
    scopeUnit === normalizeSpecialUnit(viewerUnit) &&
    hasKinjutsuUnitGrade(viewerGrade)
  );
}

export function canAccessSharedKinjutsu(
  fiche: {
    status?: string | null;
    nature?: string | null;
    kinjutsuScope?: string | null;
    clan?: string | null;
  },
  viewer: {
    clan?: string | null;
    uniteSpeciale?: string | null;
    grade?: string | null;
  } | null | undefined
): boolean {
  if (fiche.status !== "VALIDATED" || fiche.nature !== "KINJUTSU") return false;
  if (fiche.kinjutsuScope === "CLAN") {
    return !!fiche.clan && fiche.clan === viewer?.clan;
  }
  return canAccessUnitKinjutsu({
    scope: fiche.kinjutsuScope,
    viewerUnit: viewer?.uniteSpeciale,
    viewerGrade: viewer?.grade,
  });
}
