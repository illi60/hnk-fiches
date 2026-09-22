/** Shared player-facing explanations for authoritative budget checks. */
export function economyErrorMessage(code?: string): string | undefined {
  switch (code) {
    case 'FORUM_LINK_REQUIRED': return 'Un profil forum vérifié est nécessaire pour dépenser des XP.';
    case 'FORUM_UNAVAILABLE': return 'Le forum ne répond pas. Aucun achat n’a été effectué ; réessaie plus tard.';
    case 'FORUM_REFRESH_REQUIRED': return 'La vérification du forum a expiré. Réessaie pour actualiser ton budget.';
    case 'XP_BUDGET_EXCEEDED': return 'Tes dépenses dépassent ton budget forum et échanges. Les nouvelles dépenses sont bloquées ; contacte le staff pour régulariser.';
    case 'XP_HISTORY_REVIEW_REQUIRED': return 'Ton historique de remboursements nécessite une vérification du staff.';
    case 'INSUFFICIENT_XP': return 'XP disponible insuffisant.';
  }
}
