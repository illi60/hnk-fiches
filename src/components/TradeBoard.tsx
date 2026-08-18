"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { categoryLabel, isTradeableShopItem, type ShopItem } from "@/lib/shop";

type InventoryLine = {
  itemKey: string;
  itemName: string;
  costXp: number;
  quantity: number;
  reservedQuantity?: number;
};

type PlayerOption = {
  id: string;
  username: string;
  forumAvatar?: string | null;
};

type TradeItemView = {
  side: "INITIATOR" | "RECIPIENT";
  itemKey: string;
  itemName: string;
  costXp: number;
  quantity: number;
};

type TradeView = {
  id: string;
  status: "REQUESTED" | "NEGOTIATING" | "FINAL_PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";
  initiatorId: string;
  recipientId: string;
  requestMessage: string;
  initiatorXpOffered: number;
  recipientXpOffered: number;
  initiatorSubmitted: boolean;
  recipientSubmitted: boolean;
  initiatorFinalAccepted: boolean;
  recipientFinalAccepted: boolean;
  createdAt: string | Date;
  initiator: { id: string; username: string; forumAvatar?: string | null };
  recipient: { id: string; username: string; forumAvatar?: string | null };
  items: TradeItemView[];
};

type Quantities = Record<string, number>;
type Notice = { type: "ok" | "error"; body: string };

const ACTIVE_TRADE_STATUSES = new Set<TradeView["status"]>(["REQUESTED", "NEGOTIATING", "FINAL_PENDING"]);
const HISTORY_PAGE_SIZE = 6;

function humanError(error?: string): string {
  switch (error) {
    case "INSUFFICIENT_XP":
      return "XP insuffisant.";
    case "TRADE_ITEM_UNAVAILABLE":
      return "Un des objets n'est plus disponible.";
    case "TRADE_ITEM_NOT_TRADEABLE":
      return "Un des objets ne peut pas être échangé.";
    case "TRADE_FORBIDDEN":
      return "Action non autorisée.";
    case "TRADE_INVALID_STATE":
      return "Cet échange n'est plus dans le bon état.";
    case "TRADE_SCHEMA_NOT_READY":
      return "Le module d'échanges attend encore sa migration de base de données.";
    case "INVALID":
      return "La proposition envoyée est invalide côté API.";
    case "INTERNAL":
      return "Erreur serveur pendant l'envoi de la proposition.";
    case "PRISMA_ERROR":
      return "Erreur Prisma pendant l'envoi de la proposition.";
    case "RATE_LIMITED":
      return "Trop d'actions en peu de temps, réessaie dans une minute.";
    case "CONFLICT":
      return "L'échange a changé pendant l'envoi, recharge puis réessaie.";
    default:
      return "Action impossible.";
  }
}

function apiErrorMessage(json: { error?: string; code?: string; message?: string }): string {
  const base = humanError(json.error);
  if (json.code) return `${base} (${json.code})`;
  if (json.message && json.message !== json.error) return `${base} — ${json.message}`;
  return base;
}

function availableQuantity(item: InventoryLine, extra = 0): number {
  return Math.max(0, item.quantity - (item.reservedQuantity ?? 0) + extra);
}

function totalValue(items: TradeItemView[], xp: number): number {
  return items.reduce((sum, item) => sum + item.costXp * item.quantity, xp);
}

function isActiveTrade(trade: TradeView): boolean {
  return ACTIVE_TRADE_STATUSES.has(trade.status);
}

export default function TradeBoard({
  meId,
  xpAvailable,
  myInventory,
  players,
  trades,
  tradesReady,
  catalog,
}: {
  meId: string;
  xpAvailable: number;
  myInventory: InventoryLine[];
  players: PlayerOption[];
  trades: TradeView[];
  tradesReady: boolean;
  catalog: ShopItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [recipientId, setRecipientId] = useState(players[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Quantities>>({});
  const [xpDrafts, setXpDrafts] = useState<Record<string, number>>({});
  const [localTrades, setLocalTrades] = useState<TradeView[]>(trades);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [ticketNotices, setTicketNotices] = useState<Record<string, Notice>>({});
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [view, setView] = useState<"active" | "history">("active");
  const [historyPage, setHistoryPage] = useState(1);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const catalogByKey = useMemo(() => new Map(catalog.map((item) => [item.key, item])), [catalog]);
  const tradeableInventory = myInventory.filter((line) => {
    const item = catalogByKey.get(line.itemKey);
    return item && isTradeableShopItem(item);
  });

  useEffect(() => setLocalTrades(trades), [trades]);

  const activeTrades = localTrades.filter(isActiveTrade);
  const historyTrades = localTrades.filter((trade) => !isActiveTrade(trade));
  const historyPages = Math.max(1, Math.ceil(historyTrades.length / HISTORY_PAGE_SIZE));
  const safeHistoryPage = Math.min(historyPage, historyPages);
  const pagedHistoryTrades = historyTrades.slice((safeHistoryPage - 1) * HISTORY_PAGE_SIZE, safeHistoryPage * HISTORY_PAGE_SIZE);

  useEffect(() => {
    setHistoryPage((current) => Math.min(current, Math.max(1, Math.ceil(historyTrades.length / HISTORY_PAGE_SIZE))));
  }, [historyTrades.length]);

  async function postJson(url: string, body?: unknown) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      return await fetch(url, {
        method: "POST",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function deleteJson(url: string) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      return await fetch(url, {
        method: "DELETE",
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function setTicketNotice(tradeId: string, type: "ok" | "error", body: string) {
    setTicketNotices((current) => ({ ...current, [tradeId]: { type, body } }));
  }

  function clearTicketNotice(tradeId: string) {
    setTicketNotices((current) => {
      const next = { ...current };
      delete next[tradeId];
      return next;
    });
  }

  function replaceTrade(nextTrade: TradeView) {
    setLocalTrades((current) => current.map((trade) => (trade.id === nextTrade.id ? nextTrade : trade)));
  }

  function removeTrade(tradeId: string) {
    setLocalTrades((current) => current.filter((trade) => trade.id !== tradeId));
  }

  function createRequest() {
    setNotice(null);
    if (!tradesReady) {
      setNotice({ type: "error", body: "Le module d'échanges attend encore sa migration de base de données." });
      return;
    }
    if (!recipientId || message.trim().length < 3) {
      setNotice({ type: "error", body: "Choisis un joueur et écris les termes de la demande." });
      return;
    }

    start(() => {
      void (async () => {
        try {
          const res = await postJson("/api/me/trades", { recipientId, message });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) {
            setNotice({ type: "error", body: apiErrorMessage(json) });
            return;
          }
          if (json.trade) setLocalTrades((current) => [json.trade, ...current]);
          setMessage("");
          setNotice({ type: "ok", body: "Demande d'échange envoyée." });
          router.refresh();
        } catch {
          setNotice({ type: "error", body: "La requête n'a pas pu partir." });
        }
      })();
    });
  }

  function action(tradeId: string, kind: "accept" | "decline" | "cancel" | "renegotiate") {
    setNotice(null);
    clearTicketNotice(tradeId);
    if (!tradesReady || busyTicketId === tradeId) return;

    setBusyTicketId(tradeId);
    start(() => {
      void (async () => {
        try {
          const res = await postJson(`/api/me/trades/${tradeId}/${kind}`);
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) {
            setTicketNotice(tradeId, "error", apiErrorMessage(json));
            return;
          }
          if (json.trade) replaceTrade(json.trade);
          if (kind === "renegotiate") {
            setDrafts((current) => {
              const next = { ...current };
              delete next[tradeId];
              return next;
            });
            setXpDrafts((current) => {
              const next = { ...current };
              delete next[tradeId];
              return next;
            });
          }
          setTicketNotice(tradeId, "ok", actionLabel(kind));
          router.refresh();
        } catch (error) {
          const aborted = error instanceof DOMException && error.name === "AbortError";
          setTicketNotice(tradeId, "error", aborted ? "La requête a expiré après 15 secondes." : "La requête n'a pas pu partir.");
        } finally {
          setBusyTicketId(null);
        }
      })();
    });
  }

  function setLine(tradeId: string, item: InventoryLine, quantity: number, extra = 0) {
    const capped = Math.min(Math.max(0, quantity), availableQuantity(item, extra));
    setDrafts((current) => {
      const draft = { ...(current[tradeId] ?? {}) };
      if (capped <= 0) delete draft[item.itemKey];
      else draft[item.itemKey] = capped;
      return { ...current, [tradeId]: draft };
    });
  }

  function submitOffer(trade: TradeView) {
    setNotice(null);
    clearTicketNotice(trade.id);
    if (busyTicketId === trade.id) return;

    const mySide = trade.initiatorId === meId ? "INITIATOR" : "RECIPIENT";
    const currentQuantities = Object.fromEntries(
      trade.items.filter((item) => item.side === mySide).map((item) => [item.itemKey, item.quantity])
    );
    const quantities = drafts[trade.id] ?? currentQuantities;
    const xp = xpDrafts[trade.id] ?? (mySide === "INITIATOR" ? trade.initiatorXpOffered : trade.recipientXpOffered);
    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemKey, quantity]) => ({ itemKey, quantity }));

    if (items.length === 0 && xp <= 0) {
      setTicketNotice(trade.id, "error", "Ta proposition doit contenir au moins un objet ou de l'XP.");
      return;
    }

    setBusyTicketId(trade.id);
    start(() => {
      void (async () => {
        try {
          const res = await postJson(`/api/me/trades/${trade.id}/offer`, { items, xp });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) {
            setTicketNotice(trade.id, "error", apiErrorMessage(json));
            return;
          }
          if (!json.trade) {
            setTicketNotice(trade.id, "error", "La proposition a répondu sans ticket mis à jour.");
            return;
          }
          replaceTrade(json.trade);
          setTicketNotice(trade.id, "ok", "Proposition envoyée.");
          router.refresh();
        } catch (error) {
          const aborted = error instanceof DOMException && error.name === "AbortError";
          setTicketNotice(trade.id, "error", aborted ? "La requête a expiré après 15 secondes." : "La requête n'a pas pu partir.");
        } finally {
          setBusyTicketId(null);
        }
      })();
    });
  }

  function deleteCancelled(tradeId: string) {
    setNotice(null);
    clearTicketNotice(tradeId);
    if (busyTicketId === tradeId) return;

    setBusyTicketId(tradeId);
    start(() => {
      void (async () => {
        try {
          const res = await deleteJson(`/api/me/trades/${tradeId}`);
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) {
            setTicketNotice(tradeId, "error", apiErrorMessage(json));
            return;
          }
          removeTrade(tradeId);
          if (expandedHistoryId === tradeId) setExpandedHistoryId(null);
          setNotice({ type: "ok", body: "Échange annulé supprimé de l'historique." });
          router.refresh();
        } catch (error) {
          const aborted = error instanceof DOMException && error.name === "AbortError";
          setTicketNotice(tradeId, "error", aborted ? "La requête a expiré après 15 secondes." : "La requête n'a pas pu partir.");
        } finally {
          setBusyTicketId(null);
        }
      })();
    });
  }

  return (
    <div className="space-y-8">
      {!tradesReady && (
        <div className="hnk-shop-receipt hnk-shop-receipt--error">
          <p className="hnk-eyebrow">Migration requise</p>
          <strong>L'interface est prête, mais les tables d'échanges ne sont pas encore créées dans la base.</strong>
        </div>
      )}

      <section className="hnk-shop-shell">
        <div className="hnk-shop-hero">
          <div className="relative z-10 text-center">
            <p className="hnk-eyebrow text-ember-hot">Tickets privés</p>
            <h1 className="hnk-display text-4xl md:text-6xl mt-3">Échanges</h1>
            <p className="hnk-eyebrow mt-3">Marché entre shinobi</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-6 p-4 md:p-6">
          <aside className="hnk-shop-cart !static">
            <h2>Demande</h2>
            <div className="p-4 space-y-4">
              <label className="hnk-label block">
                Joueur
                <select className="hnk-input mt-2" value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.username}
                    </option>
                  ))}
                </select>
              </label>
              <label className="hnk-label block">
                Termes demandés
                <textarea
                  className="hnk-input mt-2 !min-h-40"
                  value={message}
                  maxLength={1000}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: Je cherche 2 bombes fumigènes contre 30 XP, ouvert à discussion."
                />
              </label>
              <button type="button" className="hnk-btn w-full justify-center" disabled={pending} onClick={createRequest}>
                {pending ? "Envoi..." : "Envoyer la demande"}
              </button>
            </div>
          </aside>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="hnk-section-title">Tickets d'échange</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={view === "active" ? "hnk-btn" : "hnk-btn-ghost"}
                  onClick={() => setView("active")}
                >
                  En cours ({activeTrades.length})
                </button>
                <button
                  type="button"
                  className={view === "history" ? "hnk-btn" : "hnk-btn-ghost"}
                  onClick={() => setView("history")}
                >
                  Historique ({historyTrades.length})
                </button>
              </div>
            </div>

            {view === "active" && (
              activeTrades.length === 0 ? (
                <div className="hnk-panel" data-kanji="換">
                  <p className="text-sm text-smoke">Aucun échange en cours.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTrades.map((trade) => {
                  const mySide = trade.initiatorId === meId ? "INITIATOR" : "RECIPIENT";
                  const other = trade.initiatorId === meId ? trade.recipient : trade.initiator;
                  const initiatorItems = trade.items.filter((item) => item.side === "INITIATOR");
                  const recipientItems = trade.items.filter((item) => item.side === "RECIPIENT");
                  const myItems = trade.items.filter((item) => item.side === mySide);
                  const extraByKey = Object.fromEntries(myItems.map((item) => [item.itemKey, item.quantity]));
                  const draft = drafts[trade.id] ?? Object.fromEntries(myItems.map((item) => [item.itemKey, item.quantity]));
                  const myXp = mySide === "INITIATOR" ? trade.initiatorXpOffered : trade.recipientXpOffered;
                  const finalAccepted = mySide === "INITIATOR" ? trade.initiatorFinalAccepted : trade.recipientFinalAccepted;
                  const ticketNotice = ticketNotices[trade.id];
                  const busy = busyTicketId === trade.id;
                  const canAcceptRequest = trade.status === "REQUESTED" && trade.recipientId === meId;
                  const canNegotiate = trade.status === "NEGOTIATING" || trade.status === "FINAL_PENDING";
                  const canFinalAccept = trade.status === "FINAL_PENDING" && !finalAccepted;

                  return (
                    <article key={trade.id} className="hnk-panel" data-kanji="交">
                      <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
                        <div>
                          <p className="hnk-eyebrow">Avec {other.username}</p>
                          <h3 className="font-display uppercase tracking-wider text-2xl mt-2">{statusLabel(trade.status)}</h3>
                        </div>
                        <span className="hnk-chip">{new Date(trade.createdAt).toLocaleDateString("fr-FR")}</span>
                      </div>

                      <div className="hnk-shop-confirm-box mt-4 relative z-10">
                        <p className="hnk-eyebrow">Message initial</p>
                        <p className="text-sm text-bone mt-2 leading-relaxed">{trade.requestMessage}</p>
                      </div>

                      {ticketNotice && (
                        <div className={`hnk-shop-receipt mt-4 ${ticketNotice.type === "error" ? "hnk-shop-receipt--error" : "hnk-shop-receipt--success"}`}>
                          <p className="hnk-eyebrow">{ticketNotice.type === "error" ? "Action refusée" : "Action validée"}</p>
                          <strong>{ticketNotice.body}</strong>
                        </div>
                      )}

                      {canAcceptRequest && (
                        <div className="flex flex-wrap justify-end gap-3 mt-5 relative z-10">
                          <button type="button" className="hnk-btn-ghost" disabled={busy} onClick={() => action(trade.id, "decline")}>
                            Refuser
                          </button>
                          <button type="button" className="hnk-btn" disabled={busy} onClick={() => action(trade.id, "accept")}>
                            {busy ? "Traitement..." : "Accepter les termes"}
                          </button>
                        </div>
                      )}

                      {canNegotiate && (
                        <>
                          <div className="grid md:grid-cols-2 gap-4 mt-5 relative z-10">
                            <TradeSummary title={trade.initiator.username} items={initiatorItems} xp={trade.initiatorXpOffered} submitted={trade.initiatorSubmitted} accepted={trade.initiatorFinalAccepted} />
                            <TradeSummary title={trade.recipient.username} items={recipientItems} xp={trade.recipientXpOffered} submitted={trade.recipientSubmitted} accepted={trade.recipientFinalAccepted} />
                          </div>

                          <div className="mt-5 relative z-10">
                            <TradeColumn
                              inventory={tradeableInventory}
                              quantities={draft}
                              extraByKey={extraByKey}
                              catalogByKey={catalogByKey}
                              onSet={(item, quantity, extra) => setLine(trade.id, item, quantity, extra)}
                            />
                            <label className="hnk-label block mt-4">
                              XP proposés
                              <input
                                className="hnk-input mt-2"
                                type="number"
                                min={0}
                                max={100000}
                                value={xpDrafts[trade.id] ?? myXp}
                                onChange={(e) => setXpDrafts((current) => ({ ...current, [trade.id]: Math.max(0, Number(e.target.value) || 0) }))}
                              />
                            </label>
                            <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
                              <span className="hnk-chip tabular-nums">Solde actuel {xpAvailable} XP</span>
                              <div className="flex flex-wrap gap-3">
                                <button type="button" className="hnk-btn-ghost" disabled={busy} onClick={() => action(trade.id, "cancel")}>
                                  Annuler
                                </button>
                                {trade.status === "FINAL_PENDING" && (
                                  <button type="button" className="hnk-btn-ghost" disabled={busy} onClick={() => action(trade.id, "renegotiate")}>
                                    Renégocier
                                  </button>
                                )}
                                <button type="button" className="hnk-btn" disabled={busy} onClick={() => submitOffer(trade)}>
                                  {busy ? "Envoi..." : "Envoyer ma proposition"}
                                </button>
                                {canFinalAccept && (
                                  <button type="button" className="hnk-btn" disabled={busy} onClick={() => action(trade.id, "accept")}>
                                    Valider l'échange
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </article>
                  );
                  })}
                </div>
              )
            )}

            {view === "history" && (
              <div className="space-y-4">
                {historyTrades.length === 0 ? (
                  <div className="hnk-panel" data-kanji="録">
                    <p className="text-sm text-smoke">Aucun historique pour le moment.</p>
                  </div>
                ) : (
                  <>
                    <div className="hnk-panel" data-kanji="録">
                      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
                        <div>
                          <p className="hnk-eyebrow">Historique joueur</p>
                          <h3 className="font-display uppercase tracking-wider text-2xl mt-2">
                            {historyTrades.length} échange{historyTrades.length > 1 ? "s" : ""} archivé{historyTrades.length > 1 ? "s" : ""}
                          </h3>
                        </div>
                        <span className="hnk-chip tabular-nums">
                          Page {safeHistoryPage}/{historyPages}
                        </span>
                      </div>

                      <div className="mt-5 space-y-3 relative z-10">
                        {pagedHistoryTrades.map((trade) => {
                          const other = trade.initiatorId === meId ? trade.recipient : trade.initiator;
                          const initiatorItems = trade.items.filter((item) => item.side === "INITIATOR");
                          const recipientItems = trade.items.filter((item) => item.side === "RECIPIENT");
                          const isExpanded = expandedHistoryId === trade.id;
                          const busy = busyTicketId === trade.id;
                          const ticketNotice = ticketNotices[trade.id];

                          return (
                            <div key={trade.id} className="hnk-shop-confirm-box">
                              <button
                                type="button"
                                className="w-full text-left"
                                onClick={() => setExpandedHistoryId(isExpanded ? null : trade.id)}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="hnk-eyebrow">Avec {other.username}</p>
                                    <strong className="block mt-2">{statusLabel(trade.status)}</strong>
                                  </div>
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <span className="hnk-chip tabular-nums">
                                      {totalValue(initiatorItems, trade.initiatorXpOffered) + totalValue(recipientItems, trade.recipientXpOffered)} XP
                                    </span>
                                    <span className="hnk-chip">{new Date(trade.createdAt).toLocaleDateString("fr-FR")}</span>
                                  </div>
                                </div>
                              </button>

                              {ticketNotice && (
                                <div className={`hnk-shop-receipt mt-4 ${ticketNotice.type === "error" ? "hnk-shop-receipt--error" : "hnk-shop-receipt--success"}`}>
                                  <p className="hnk-eyebrow">{ticketNotice.type === "error" ? "Action refusée" : "Action validée"}</p>
                                  <strong>{ticketNotice.body}</strong>
                                </div>
                              )}

                              {isExpanded && (
                                <div className="mt-4 space-y-4">
                                  <div>
                                    <p className="hnk-eyebrow">Message initial</p>
                                    <p className="text-sm text-bone mt-2 leading-relaxed">{trade.requestMessage}</p>
                                  </div>
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <TradeSummary
                                      title={trade.initiator.username}
                                      items={initiatorItems}
                                      xp={trade.initiatorXpOffered}
                                      submitted={trade.initiatorSubmitted}
                                      accepted={trade.initiatorFinalAccepted}
                                    />
                                    <TradeSummary
                                      title={trade.recipient.username}
                                      items={recipientItems}
                                      xp={trade.recipientXpOffered}
                                      submitted={trade.recipientSubmitted}
                                      accepted={trade.recipientFinalAccepted}
                                    />
                                  </div>
                                  {trade.status === "CANCELLED" && (
                                    <div className="flex justify-end">
                                      <button type="button" className="hnk-btn-ghost" disabled={busy} onClick={() => deleteCancelled(trade.id)}>
                                        {busy ? "Suppression..." : "Supprimer l'échange annulé"}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {historyPages > 1 && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          className="hnk-btn-ghost"
                          disabled={safeHistoryPage <= 1}
                          onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                        >
                          Précédent
                        </button>
                        {Array.from({ length: historyPages }, (_, index) => index + 1).map((page) => (
                          <button
                            key={page}
                            type="button"
                            className={page === safeHistoryPage ? "hnk-btn" : "hnk-btn-ghost"}
                            onClick={() => setHistoryPage(page)}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="hnk-btn-ghost"
                          disabled={safeHistoryPage >= historyPages}
                          onClick={() => setHistoryPage((page) => Math.min(historyPages, page + 1))}
                        >
                          Suivant
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </section>

      {notice && (
        <div className={`hnk-shop-receipt ${notice.type === "error" ? "hnk-shop-receipt--error" : "hnk-shop-receipt--success"}`}>
          <p className="hnk-eyebrow">{notice.type === "error" ? "Action refusée" : "Action validée"}</p>
          <strong>{notice.body}</strong>
        </div>
      )}
    </div>
  );
}

function TradeColumn({
  inventory,
  quantities,
  extraByKey,
  catalogByKey,
  onSet,
}: {
  inventory: InventoryLine[];
  quantities: Quantities;
  extraByKey: Record<string, number>;
  catalogByKey: Map<string, ShopItem>;
  onSet: (item: InventoryLine, quantity: number, extra: number) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="hnk-eyebrow">Ton inventaire échangeable</p>
      {inventory.length === 0 ? (
        <div className="hnk-shop-cart-empty !min-h-28">
          <p>Aucun objet échangeable disponible.</p>
        </div>
      ) : (
        inventory.map((line) => {
          const item = catalogByKey.get(line.itemKey);
          const extra = extraByKey[line.itemKey] ?? 0;
          const available = availableQuantity(line, extra);
          const quantity = quantities[line.itemKey] ?? 0;
          return (
            <div key={line.itemKey} className="hnk-shop-cart-line">
              <div className="min-w-0">
                <p className="truncate">{item?.name ?? line.itemName}</p>
                <span className="tabular-nums">{item ? categoryLabel(item.category) : "Objet"} · dispo x{available}</span>
              </div>
              <div className="hnk-shop-stepper">
                <button type="button" onClick={() => onSet(line, quantity - 1, extra)}>
                  -
                </button>
                <span>{quantity}</span>
                <button type="button" disabled={quantity >= available} onClick={() => onSet(line, quantity + 1, extra)}>
                  +
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function TradeSummary({ title, items, xp, submitted, accepted }: { title: string; items: TradeItemView[]; xp: number; submitted: boolean; accepted: boolean }) {
  return (
    <div className="hnk-shop-confirm-box">
      <div className="flex items-center justify-between gap-4">
        <strong>{title}</strong>
        <span className="hnk-chip tabular-nums">{totalValue(items, xp)} XP estimés</span>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <span className="hnk-chip">{submitted ? "Proposition envoyée" : "En attente"}</span>
        {accepted && <span className="hnk-chip">Validation finale OK</span>}
        {xp > 0 && <span className="hnk-chip tabular-nums">{xp} XP</span>}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-smoke mt-3">Aucun objet proposé.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={`${item.side}:${item.itemKey}`} className="flex justify-between gap-3 text-sm">
              <span>{item.itemName}</span>
              <span className="tabular-nums text-ember">x{item.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function statusLabel(status: TradeView["status"]): string {
  switch (status) {
    case "REQUESTED":
      return "Demande envoyée";
    case "NEGOTIATING":
      return "Négociation en cours";
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
  }
}

function actionLabel(kind: "accept" | "decline" | "cancel" | "renegotiate"): string {
  switch (kind) {
    case "accept":
      return "Validation enregistrée.";
    case "decline":
      return "Échange refusé.";
    case "cancel":
      return "Échange annulé.";
    case "renegotiate":
      return "Retour en négociation.";
  }
}
