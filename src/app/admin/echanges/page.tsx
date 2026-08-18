import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type TradeRow = Awaited<ReturnType<typeof loadTrades>>[number];

function sideTotal(trade: TradeRow, side: "INITIATOR" | "RECIPIENT") {
  const xp = side === "INITIATOR" ? trade.initiatorXpOffered : trade.recipientXpOffered;
  return trade.items.filter((item) => item.side === side).reduce((sum, item) => sum + item.costXp * item.quantity, xp);
}

function suspicionLabels(trade: TradeRow) {
  const initiator = sideTotal(trade, "INITIATOR");
  const recipient = sideTotal(trade, "RECIPIENT");
  const max = Math.max(initiator, recipient);
  const min = Math.min(initiator, recipient);
  const labels: string[] = [];

  if (max > 0 && min === 0) labels.push("Don unilatéral");
  if ((trade.initiatorXpOffered > 0 || trade.recipientXpOffered > 0) && min === 0) labels.push("Don d'XP");
  if (min > 0 && max >= min * 3 && max - min >= 100) labels.push("Écart de valeur élevé");
  if (trade.status === "ACCEPTED" && max >= 250 && min <= 50) labels.push("Transaction lourde déséquilibrée");

  return labels;
}

async function loadTrades() {
  return prisma.trade.findMany({
    orderBy: { updatedAt: "desc" },
    take: 150,
    include: {
      initiator: { select: { id: true, username: true, forumPseudo: true, clan: true } },
      recipient: { select: { id: true, username: true, forumPseudo: true, clan: true } },
      items: { orderBy: [{ side: "asc" }, { itemName: "asc" }] },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, username: true } } },
      },
    },
  });
}

export default async function AdminTradesPage() {
  await requireAdmin();

  let missingTable = false;
  const trades = await loadTrades().catch((error) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      ((error as { code?: string }).code === "P2021" || (error as { code?: string }).code === "P2022")
    ) {
      missingTable = true;
      return [] as TradeRow[];
    }
    throw error;
  });

  const suspiciousCount = trades.filter((trade) => suspicionLabels(trade).length > 0).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] tracking-[0.34em] uppercase text-smoke">Échanges</p>
        <h1 className="font-serif text-3xl text-white2 mt-1">Surveillance des transactions</h1>
        <p className="text-sm text-smoke mt-2 max-w-2xl">
          Suivi des tickets joueur à joueur, valeurs échangées, messages de négociation et signaux de dons suspects.
        </p>
      </div>

      {missingTable ? (
        <div className="hnk-panel" data-kanji="警">
          <p className="hnk-eyebrow">Migration requise</p>
          <p className="text-sm text-bone/75 mt-3 leading-relaxed">
            Les tables d'échanges ne sont pas encore disponibles dans la base.
          </p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <AdminTradeStat label="Tickets suivis" value={trades.length} />
            <AdminTradeStat label="Échanges suspects" value={suspiciousCount} accent />
            <AdminTradeStat label="Acceptés" value={trades.filter((trade) => trade.status === "ACCEPTED").length} />
          </div>

          <section className="space-y-3">
            <h2 className="hnk-section-title">Derniers échanges</h2>
            {trades.length === 0 ? (
              <div className="hnk-panel" data-kanji="交">
                <p className="text-sm text-smoke">Aucun échange à afficher.</p>
              </div>
            ) : (
              trades.map((trade) => {
                const initiatorValue = sideTotal(trade, "INITIATOR");
                const recipientValue = sideTotal(trade, "RECIPIENT");
                const labels = suspicionLabels(trade);
                const suspicious = labels.length > 0;

                return (
                  <details key={trade.id} className={`hnk-panel ${suspicious ? "!border-ember !bg-[linear-gradient(160deg,rgba(56,24,18,0.98),rgba(11,13,17,0.98))]" : ""}`} data-kanji={suspicious ? "警" : "交"}>
                    <summary className="relative z-10 cursor-pointer list-none">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="hnk-eyebrow">
                            {trade.initiator.username} → {trade.recipient.username}
                          </p>
                          <h3 className="font-display uppercase tracking-wider text-2xl mt-2">{statusLabel(trade.status)}</h3>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          {labels.map((label) => (
                            <span key={label} className="hnk-chip">{label}</span>
                          ))}
                          <span className="hnk-chip tabular-nums">{initiatorValue} XP / {recipientValue} XP</span>
                          <span className="hnk-chip">{trade.updatedAt.toLocaleDateString("fr-FR")}</span>
                        </div>
                      </div>
                    </summary>

                    <div className="relative z-10 mt-5 space-y-5">
                      <div className="hnk-shop-confirm-box">
                        <p className="hnk-eyebrow">Message initial</p>
                        <p className="text-sm text-bone mt-2 leading-relaxed">{trade.requestMessage}</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <AdminTradeSide title={trade.initiator.username} value={initiatorValue} xp={trade.initiatorXpOffered} items={trade.items.filter((item) => item.side === "INITIATOR")} />
                        <AdminTradeSide title={trade.recipient.username} value={recipientValue} xp={trade.recipientXpOffered} items={trade.items.filter((item) => item.side === "RECIPIENT")} />
                      </div>
                      <div className="hnk-shop-confirm-box">
                        <p className="hnk-eyebrow">Fil de discussion</p>
                        {trade.messages.length === 0 ? (
                          <p className="text-sm text-smoke mt-3">Aucun message.</p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {trade.messages.map((message) => (
                              <div key={message.id}>
                                <p className="hnk-eyebrow">
                                  {message.author.username} · {message.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                                </p>
                                <p className="text-sm text-bone mt-1 leading-relaxed">{message.body}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}

function AdminTradeStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="hnk-panel" data-kanji={accent ? "警" : "数"}>
      <p className="hnk-eyebrow">{label}</p>
      <p className={`font-display text-4xl mt-3 ${accent ? "text-ember" : "text-white"}`}>{value}</p>
    </div>
  );
}

function AdminTradeSide({
  title,
  value,
  xp,
  items,
}: {
  title: string;
  value: number;
  xp: number;
  items: Array<{ itemName: string; costXp: number; quantity: number }>;
}) {
  return (
    <div className="hnk-shop-confirm-box">
      <div className="flex items-center justify-between gap-3">
        <strong>{title}</strong>
        <span className="hnk-chip tabular-nums">{value} XP estimés</span>
      </div>
      {xp > 0 && <p className="text-sm text-ember mt-3 tabular-nums">{xp} XP proposés</p>}
      {items.length === 0 ? (
        <p className="text-sm text-smoke mt-3">Aucun objet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.itemName} className="flex justify-between gap-3 text-sm">
              <span>{item.itemName}</span>
              <span className="tabular-nums text-ember">x{item.quantity} · {item.costXp * item.quantity} XP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "REQUESTED":
      return "Demande";
    case "NEGOTIATING":
      return "Négociation";
    case "FINAL_PENDING":
      return "Validation finale";
    case "ACCEPTED":
      return "Accepté";
    case "DECLINED":
      return "Refusé";
    case "CANCELLED":
      return "Annulé";
    case "EXPIRED":
      return "Expiré";
    default:
      return status;
  }
}
