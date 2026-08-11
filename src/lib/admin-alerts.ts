export function repairAdminAlertText(value: string): string {
  return value
    .replaceAll("Reconqu?tes", "Reconquêtes")
    .replaceAll("Reconqu?te", "Reconquête")
    .replaceAll("Contr?e", "Contrée")
    .replaceAll("Cont?e", "Contée")
    .replaceAll("? z?ro", "à zéro")
    .replaceAll("achet?e", "achetée")
    .replaceAll("achet?", "acheté")
    .replaceAll("Reconquetes", "Reconquêtes")
    .replaceAll("Reconquete", "Reconquête")
    .replaceAll("Contree", "Contrée")
    .replaceAll("achetee", "achetée")
    .replaceAll("achete", "acheté")
    .replaceAll("remises a zero", "remises à zéro")
    .replaceAll("remis a zero", "remis à zéro")
    .replaceAll("a baisse", "a baissé")
    .replaceAll("reconquetes", "reconquêtes")
    .replaceAll("reconquete", "reconquête");
}

export function adminAlertKindLabel(kind: string): string {
  if (kind === "SHOP_RECONQUEST") return "Reconquête";
  if (kind === "SHOP_GRADE_REQUEST") return "Grade";
  if (kind === "SHOP_RECONQUEST_ADMIN") return "Admin";
  return kind.replace(/_/g, " ").toLowerCase();
}
