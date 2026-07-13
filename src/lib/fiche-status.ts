export type FicheStatus = "DRAFT" | "PENDING" | "VALIDATED" | "REJECTED";

export function isFicheEditable(status?: string | null) {
  return status !== "VALIDATED";
}

export function canDeleteFiche(status?: string | null) {
  return status === "DRAFT" || status === "REJECTED";
}

export function canWithdrawFiche(status?: string | null) {
  return status === "PENDING";
}

export function canSubmitFiche(status?: string | null) {
  return status === "DRAFT" || status === "REJECTED";
}

export function ficheStatusLabel(status?: string | null) {
  switch (status) {
    case "DRAFT":
      return "Brouillon";
    case "PENDING":
      return "En attente de validation";
    case "VALIDATED":
      return "Validée";
    case "REJECTED":
      return "Refusée";
    default:
      return "—";
  }
}
