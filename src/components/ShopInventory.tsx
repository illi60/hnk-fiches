"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import {
  SHOP_CATEGORIES,
  SHOP_CATEGORY_META,
  SHOP_CONTE_GROUP_META,
  SHOP_CONTE_GROUPS,
  SHOP_DISCOUNT_ITEM_KEY,
  SHOP_SERVICE_GROUP_META,
  SHOP_SERVICE_GROUPS,
  SHOP_TOOL_GROUP_META,
  SHOP_TOOL_GROUPS,
  categoryLabel,
  conteGroupForItem,
  discountedShopCost,
  gradeServiceLockReason,
  isDlcVillageCUnlocked,
  isConditionUnlockItemKey,
  isRerollFtItemKey,
  rerollFtBaseCostForPurchase,
  serviceGroupForItem,
  shopItemCost,
  SHOP_PROMOTION_CHUNIN_ITEM_KEY,
  SHOP_PROMOTION_JONIN_ITEM_KEY,
  toolGroupForItem,
  type ShopCategory,
  type ShopItem,
} from "@/lib/shop";

export interface InventoryView {
  itemKey: string;
  itemName: string;
  costXp: number;
  quantity: number;
}

type Cart = Record<string, number>;
type UnlockOption = {
  condId: string;
  label: string;
  tier: "COMMUNITY" | "INDIVIDUAL";
  current: number;
  target: number;
};
type UnlockModalState = {
  item: ShopItem;
  costXp: number;
  options: UnlockOption[];
  loading: boolean;
  error: string | null;
} | null;
type RerollModalState = {
  item: ShopItem;
  costXp: number;
  resetTechnique: boolean;
  refundAndCharge: boolean;
  loading: boolean;
  error: string | null;
} | null;
type CheckoutNotice = {
  title: string;
  body: string;
  total: number;
  refreshOnClose: boolean;
} | null;
type ShopEntry =
  | { kind: "heading"; key: string; groupKey: string; label: string; kanji: string; count: number }
  | { kind: "item"; key: string; item: ShopItem };

const CATEGORY_ORDER: ShopCategory[] = [...SHOP_CATEGORIES];

function humanError(error?: string): string {
  switch (error) {
    case "INSUFFICIENT_XP":
      return "XP insuffisant.";
    case "DUPLICATE":
      return "Objet unique déjà possédé.";
    case "RATE_LIMITED":
      return "Trop d'achats en peu de temps, réessaie dans une minute.";
    case "CONFLICT":
      return "Conflit de solde XP, réessaie.";
    case "NOT_FOUND":
      return "Objet introuvable.";
    case "INELIGIBLE":
      return "Cet achat n'est plus disponible pour ton rang actuel.";
    default:
      return "Validation impossible.";
  }
}

export default function ShopInventory({
  items,
  inventory,
  xpAvailable,
  villageRank,
  grade,
}: {
  items: ShopItem[];
  inventory: InventoryView[];
  xpAvailable: number;
  villageRank?: string | null;
  grade?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState<ShopCategory>("RELIQUES");
  const [cart, setCart] = useState<Cart>({});
  const [closedSections, setClosedSections] = useState<Record<string, boolean>>({});
  const [unlockModal, setUnlockModal] = useState<UnlockModalState>(null);
  const [rerollModal, setRerollModal] = useState<RerollModalState>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<CheckoutNotice>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const ownedByKey = useMemo(
    () => new Map(inventory.map((item) => [item.itemKey, item])),
    [inventory]
  );
  const hasShopDiscount = ownedByKey.has(SHOP_DISCOUNT_ITEM_KEY);
  const hasChuninPromotion = (ownedByKey.get(SHOP_PROMOTION_CHUNIN_ITEM_KEY)?.quantity ?? 0) > 0;
  const hasJoninPromotion = (ownedByKey.get(SHOP_PROMOTION_JONIN_ITEM_KEY)?.quantity ?? 0) > 0;
  const itemByKey = useMemo(() => new Map(items.map((item) => [item.key, item])), [items]);
  const dlcVillageUnlocked = isDlcVillageCUnlocked({ villageRank });
  const filteredItems = items.filter((item) => item.category === category);
  const serviceSections = SHOP_SERVICE_GROUPS.map((group) => ({
    group,
    items: filteredItems.filter((item) => serviceGroupForItem(item) === group),
  })).filter((section) => section.items.length > 0);
  const conteSections = SHOP_CONTE_GROUPS.map((group) => ({
    group,
    items: filteredItems.filter((item) => conteGroupForItem(item) === group),
  })).filter((section) => section.items.length > 0);
  const toolSections = SHOP_TOOL_GROUPS.map((group) => ({
    group,
    items: filteredItems.filter((item) => toolGroupForItem(item) === group),
  })).filter((section) => section.items.length > 0);
  const displayedEntries: ShopEntry[] =
    category === "SERVICES"
      ? serviceSections.flatMap((section) => {
          const meta = SHOP_SERVICE_GROUP_META[section.group];
          const groupKey = `SERVICES:${section.group}`;
          const heading: ShopEntry = {
            kind: "heading",
            key: groupKey,
            groupKey,
            label: meta.label,
            kanji: meta.kanji,
            count: section.items.length,
          };
          return closedSections[groupKey]
            ? [heading]
            : [heading, ...section.items.map((item) => ({ kind: "item" as const, key: item.key, item }))];
        })
      : category === "CONTES"
        ? conteSections.flatMap((section) => {
            const meta = SHOP_CONTE_GROUP_META[section.group];
            const groupKey = `CONTES:${section.group}`;
            const heading: ShopEntry = {
              kind: "heading",
              key: groupKey,
              groupKey,
              label: meta.label,
              kanji: meta.kanji,
              count: section.items.length,
            };
            return closedSections[groupKey]
              ? [heading]
              : [heading, ...section.items.map((item) => ({ kind: "item" as const, key: item.key, item }))];
          })
        : category === "OUTILS_SHINOBI"
          ? toolSections.flatMap((section) => {
              const meta = SHOP_TOOL_GROUP_META[section.group];
              const groupKey = `OUTILS_SHINOBI:${section.group}`;
              const heading: ShopEntry = {
                kind: "heading",
                key: groupKey,
                groupKey,
                label: meta.label,
                kanji: meta.kanji,
                count: section.items.length,
              };
              return closedSections[groupKey]
                ? [heading]
                : [heading, ...section.items.map((item) => ({ kind: "item" as const, key: item.key, item }))];
            })
          : filteredItems.map((item) => ({ kind: "item" as const, key: item.key, item }));
  const cartLines = Object.entries(cart)
    .map(([key, quantity]) => {
      const item = itemByKey.get(key);
      const previousPurchases = item ? ownedByKey.get(item.key)?.quantity ?? 0 : 0;
      const unitCost = item ? shopItemCost(item, hasShopDiscount, previousPurchases) : 0;
      const baseUnitCost = item && isRerollFtItemKey(item.key) ? rerollFtBaseCostForPurchase(item, previousPurchases) : item?.costXp ?? 0;
      return item ? { item, quantity, unitCost, baseUnitCost, subtotal: unitCost * quantity } : null;
    })
    .filter((line): line is { item: ShopItem; quantity: number; unitCost: number; baseUnitCost: number; subtotal: number } => !!line);
  const cartTotal = cartLines.reduce((sum, line) => sum + line.subtotal, 0);
  const remainingXp = xpAvailable - cartTotal;

  useEffect(() => {
    setMounted(true);
  }, []);

  function setQuantity(item: ShopItem, nextQuantity: number) {
    setError(null);
    setSuccess(null);
    setCart((current) => {
      const next = { ...current };
      const capped = item.stock === "UNIQUE" ? Math.min(nextQuantity, 1) : nextQuantity;
      if (capped <= 0) {
        delete next[item.key];
      } else {
        next[item.key] = capped;
      }
      return next;
    });
  }

  function add(item: ShopItem) {
    const owned = ownedByKey.get(item.key);
    if (item.stock === "UNIQUE" && owned) {
      setError("Objet unique déjà possédé.");
      return;
    }
    setQuantity(item, (cart[item.key] ?? 0) + 1);
  }

  function openConditionUnlock(item: ShopItem) {
    setError(null);
    setSuccess(null);
    setUnlockModal({ item, costXp: discountedShopCost(item, hasShopDiscount), options: [], loading: true, error: null });
    start(async () => {
      const res = await fetch(`/api/me/shop/condition-unlock/options?itemKey=${encodeURIComponent(item.key)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setUnlockModal({ item, costXp: discountedShopCost(item, hasShopDiscount), options: [], loading: false, error: humanError(json.error) });
        return;
      }
      setUnlockModal({
        item,
        costXp: json.item?.costXp ?? discountedShopCost(item, hasShopDiscount),
        options: json.options ?? [],
        loading: false,
        error: null,
      });
    });
  }

  function buyConditionUnlock(condId: string) {
    if (!unlockModal) return;
    const item = unlockModal.item;
    setUnlockModal({ ...unlockModal, loading: true, error: null });
    start(async () => {
      const res = await fetch("/api/me/shop/condition-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: item.key, condId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setUnlockModal((current) =>
          current ? { ...current, loading: false, error: humanError(json.error) } : current
        );
        return;
      }
      setUnlockModal(null);
      setSuccess(`Prérequis débloqué : ${json.total} XP dépensés.`);
      router.refresh();
    });
  }

  function openRerollFt(item: ShopItem) {
    setError(null);
    setSuccess(null);
    setRerollModal({
      item,
      costXp: shopItemCost(item, hasShopDiscount, ownedByKey.get(item.key)?.quantity ?? 0),
      resetTechnique: false,
      refundAndCharge: false,
      loading: false,
      error: null,
    });
  }

  function buyRerollFt() {
    if (!rerollModal || !rerollModal.resetTechnique || !rerollModal.refundAndCharge) return;
    const item = rerollModal.item;
    setRerollModal({ ...rerollModal, loading: true, error: null });
    start(async () => {
      const res = await fetch("/api/me/shop/reroll-ft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetTechnique: true, refundAndCharge: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setRerollModal((current) =>
          current ? { ...current, loading: false, error: humanError(json.error) } : current
        );
        return;
      }
      setRerollModal(null);
      setCheckoutNotice({
        title: "Fiche technique remise à zéro",
        body: `Reroll effectué : ${json.refund ?? 0} XP techniques remboursés, ${json.cost ?? item.costXp} XP débités pour le jeton. Tes fiches techniques, invocations, arts, Kekkei Genkai et affinités ont été remis à zéro. Ton profil RP, tes rangs, ton clan, ta trame, ton unité, tes titres et ton inventaire sont conservés.`,
        total: json.cost ?? item.costXp,
        refreshOnClose: true,
      });
    });
  }

  function toggleSection(groupKey: string) {
    setClosedSections((current) => ({ ...current, [groupKey]: !current[groupKey] }));
  }

  function checkout() {
    setError(null);
    setSuccess(null);
    start(async () => {
      const res = await fetch("/api/me/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartLines.map((line) => ({ itemKey: line.item.key, quantity: line.quantity })),
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setError(humanError(json.error));
        return;
      }

      setCart({});
      if (json.notice) {
        setCheckoutNotice({
          title: json.noticeTitle ?? "Commande validée",
          body: json.notice,
          total: json.total ?? 0,
          refreshOnClose: true,
        });
        setSuccess(null);
      } else {
        setSuccess(`Commande validée : ${json.total} XP dépensés.`);
        router.refresh();
      }
    });
  }

  function closeCheckoutNotice() {
    const shouldRefresh = checkoutNotice?.refreshOnClose;
    setCheckoutNotice(null);
    if (shouldRefresh) router.refresh();
  }

  return (
    <div className="hnk-shop-shell">
      <section className="hnk-shop-hero">
        <div className="relative z-10 text-center">
          <p className="hnk-eyebrow text-ember-hot">Konoha · Quartier marchand</p>
          <h1 className="hnk-display text-4xl md:text-6xl mt-3">Boutique Shinobi</h1>
          <p className="font-display uppercase tracking-[0.24em] text-white/85 mt-2">
            Matériel & reliques
          </p>
        </div>
      </section>

      <div className="hnk-shop-category-grid border-b border-white/10">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`hnk-shop-subtab ${category === cat ? "hnk-shop-subtab--active" : ""} ${cat === "DLC_VILLAGE_C" && !dlcVillageUnlocked ? "hnk-shop-subtab--locked" : ""}`}
            data-category={cat}
            onClick={() => setCategory(cat)}
          >
            <span aria-hidden>{SHOP_CATEGORY_META[cat].kanji}</span>
            {categoryLabel(cat)}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 p-4 md:p-6">
        <section className="min-w-0">
          <div className="space-y-5">
            {displayedEntries.map((entry) => {
              if (entry.kind === "heading") {
                return (
                  <button
                    key={entry.key}
                    type="button"
                    className="hnk-shop-subcategory"
                    data-service-group={entry.groupKey.split(":")[1]}
                    aria-expanded={!closedSections[entry.groupKey]}
                    onClick={() => toggleSection(entry.groupKey)}
                  >
                    <span aria-hidden>{entry.kanji}</span>
                    <h2>{entry.label}</h2>
                    <small>{entry.count}</small>
                    <strong aria-hidden>{closedSections[entry.groupKey] ? "+" : "-"}</strong>
                  </button>
                );
              }

              const item = entry.item;
              const owned = ownedByKey.get(item.key);
              const inCart = cart[item.key] ?? 0;
              const uniqueOwned = item.stock === "UNIQUE" && !!owned;
              const previousPurchases = ownedByKey.get(item.key)?.quantity ?? 0;
              const serviceGroup = serviceGroupForItem(item);
              const conditionUnlock = isConditionUnlockItemKey(item.key);
              const rerollFt = isRerollFtItemKey(item.key);
              const unitCost = shopItemCost(item, hasShopDiscount, rerollFt ? previousPurchases : 0);
              const baseUnitCost = rerollFt ? rerollFtBaseCostForPurchase(item, previousPurchases) : item.costXp;
              const hasLineDiscount = unitCost < baseUnitCost;
              const cannotAffordAlone = unitCost > xpAvailable;
              const dlcLocked = item.category === "DLC_VILLAGE_C" && !dlcVillageUnlocked;
              const gradeLockReason = gradeServiceLockReason(item.key, { grade, hasChuninPromotion, hasJoninPromotion });
              const isRankIcon = /^[A-Z]$/.test(item.kanji);
              const projectedCost = conditionUnlock || rerollFt ? unitCost : cartTotal + unitCost;
              const cannotAffordNext = projectedCost > xpAvailable;
              const disablesAdd = pending || uniqueOwned || dlcLocked || !!gradeLockReason || (cannotAffordNext && !rerollFt);
              const relicOwned = item.category === "RELIQUES" && uniqueOwned;
              const lockedByXp = relicOwned || dlcLocked || !!gradeLockReason || (cannotAffordNext && !rerollFt);

              return (
                <article
                  key={item.key}
                  className={`hnk-shop-row ${item.stock === "UNIQUE" ? "hnk-shop-row--unique" : ""} ${
                    lockedByXp ? "hnk-shop-row--locked" : ""
                  }`}
                  data-category={item.category}
                  data-service-group={serviceGroup ?? undefined}
                >
                  <div className={`hnk-shop-thumb ${isRankIcon ? "hnk-shop-thumb--rank" : ""}`} aria-hidden>
                    {isRankIcon ? (
                      <span className={`hnk-rank-sigil hnk-rank-sigil--${item.kanji.toLowerCase()}`}>
                        <i>Rang</i>
                        <b>{item.kanji}</b>
                      </span>
                    ) : (
                      <span>{item.kanji}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="hnk-shop-row-head">
                      <h2>{item.name}</h2>
                      <div className="hnk-shop-meta">
                        <span>{categoryLabel(item.category)}</span>
                        <span className={`tabular-nums ${lockedByXp ? "hnk-shop-price--locked" : ""}`}>
                          {hasLineDiscount && <s>{baseUnitCost}</s>} {unitCost} XP
                        </span>
                        <button
                          type="button"
                          className="hnk-shop-plus"
                          disabled={disablesAdd}
                          onClick={() => (conditionUnlock ? openConditionUnlock(item) : rerollFt ? openRerollFt(item) : add(item))}
                          aria-label={
                            conditionUnlock
                              ? `Choisir un prérequis pour ${item.name}`
                              : rerollFt
                                ? "Confirmer le reroll FT"
                                : `Ajouter ${item.name} au panier`
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="hnk-shop-copy">
                      <p>
                        <strong>Description:</strong> {item.description}
                      </p>
                      <p>
                        <strong>Effet:</strong> {item.effect}
                      </p>
                    </div>

                    <div className="hnk-shop-tags">
                      <span className="hnk-chip">{item.stock === "UNIQUE" ? "Permanent" : "Unique"}</span>
                      {conditionUnlock && <span className="hnk-chip">Choix direct</span>}
                      {rerollFt && <span className="hnk-chip">Action directe</span>}
                      {rerollFt && previousPurchases > 0 && <span className="hnk-chip">Palier {previousPurchases + 1}</span>}
                      {serviceGroup && <span className="hnk-chip">{SHOP_SERVICE_GROUP_META[serviceGroup].label}</span>}
                      {item.rankHint && <span className="hnk-chip">{item.rankHint}</span>}
                      {owned && <span className="hnk-chip">Possédé x{owned.quantity}</span>}
                      {hasLineDiscount && <span className="hnk-chip">Réduction -25%</span>}
                      {inCart > 0 && <span className="hnk-chip">Panier x{inCart}</span>}
                      {dlcLocked && <span className="hnk-chip hnk-chip--danger">Rang Village C requis</span>}
                      {gradeLockReason && <span className="hnk-chip hnk-chip--danger">{gradeLockReason}</span>}
                      {cannotAffordAlone && !rerollFt && <span className="hnk-chip hnk-chip--danger">XP insuffisant</span>}
                      {!cannotAffordAlone && cannotAffordNext && !rerollFt && (
                        <span className="hnk-chip hnk-chip--danger">Panier trop cher</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="hnk-shop-cart">
          <h2>Panier</h2>
          <div className="p-4">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <p className="hnk-eyebrow">Solde</p>
                <p className="hnk-stat mt-1 tabular-nums">{xpAvailable}</p>
              </div>
              {hasShopDiscount && <span className="hnk-chip">Réduction boutique -25%</span>}
              <span className={`hnk-chip ${remainingXp < 0 ? "!text-ember-hot" : ""}`}>
                Reste {remainingXp} XP
              </span>
            </div>

            {cartLines.length === 0 ? (
              <div className="hnk-shop-cart-empty">
                <p>Ajoute des articles avec le bouton +.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartLines.map((line) => (
                  <div key={line.item.key} className="hnk-shop-cart-line">
                    <div className="min-w-0">
                      <p className="truncate">{line.item.name}</p>
                      <span className="tabular-nums">
                        {line.unitCost < line.baseUnitCost && <s>{line.baseUnitCost * line.quantity}</s>} {line.subtotal} XP
                      </span>
                    </div>
                    <div className="hnk-shop-stepper">
                      <button type="button" onClick={() => setQuantity(line.item, line.quantity - 1)}>
                        -
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        disabled={line.item.stock === "UNIQUE" || remainingXp < line.unitCost}
                        onClick={() => setQuantity(line.item, line.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="hnk-shop-total">
              <span>Total</span>
              <strong className="tabular-nums">{cartTotal} XP</strong>
            </div>

            <button
              type="button"
              className="hnk-btn w-full justify-center mt-4 disabled:opacity-45"
              disabled={pending || cartLines.length === 0 || cartTotal > xpAvailable}
              onClick={checkout}
            >
              {pending ? "Validation..." : "Valider le panier"}
            </button>

            {(error || success) && (
              <div className={`hnk-shop-receipt ${error ? "hnk-shop-receipt--error" : "hnk-shop-receipt--success"}`}>
                <p className="hnk-eyebrow">{error ? "Transaction refusée" : "Transaction validée"}</p>
                <strong>{error ?? success}</strong>
              </div>
            )}
          </div>
        </aside>
      </div>

      {mounted && unlockModal && createPortal(
        <div className="hnk-modal-backdrop" role="presentation" onClick={() => !unlockModal.loading && setUnlockModal(null)}>
          <div className="hnk-shop-unlock-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="hnk-eyebrow">Déblocage de prérequis</p>
                <h2>{unlockModal.item.name}</h2>
              </div>
              <button
                type="button"
                className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]"
                disabled={unlockModal.loading}
                onClick={() => setUnlockModal(null)}
              >
                Fermer
              </button>
            </div>

            <p className="mt-3 text-sm text-smoke leading-relaxed">
              Choisis un prérequis non rempli. L'achat est appliqué directement, sans panier, et recalcule ton niveau de progression.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="hnk-chip">{unlockModal.costXp} XP</span>
              <span className="hnk-chip">{unlockModal.options.length} choix</span>
            </div>

            {unlockModal.loading ? (
              <p className="mt-5 text-sm text-smoke">Chargement...</p>
            ) : unlockModal.error ? (
              <p className="mt-5 text-sm text-ember-hot">{unlockModal.error}</p>
            ) : unlockModal.options.length === 0 ? (
              <p className="mt-5 text-sm text-smoke">Aucun prérequis non rempli disponible pour ce palier.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {unlockModal.options.map((option) => (
                  <button
                    key={option.condId}
                    type="button"
                    className="hnk-shop-unlock-option"
                    disabled={pending || unlockModal.costXp > xpAvailable}
                    onClick={() => buyConditionUnlock(option.condId)}
                  >
                    <span>{option.tier === "COMMUNITY" ? "Communautaire" : "Individuel"}</span>
                    <strong>{option.label}</strong>
                    <small>
                      {option.current}/{option.target}
                    </small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {mounted && rerollModal && createPortal(
        <div className="hnk-modal-backdrop" role="presentation" onClick={() => !rerollModal.loading && setRerollModal(null)}>
          <div className="hnk-shop-unlock-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="hnk-eyebrow">Action directe boutique</p>
                <h2>{rerollModal.item.name}</h2>
              </div>
              <button
                type="button"
                className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]"
                disabled={rerollModal.loading}
                onClick={() => setRerollModal(null)}
              >
                Fermer
              </button>
            </div>

            <p className="mt-3 text-sm text-smoke leading-relaxed">
              Cet achat remet uniquement ta partie technique à zéro. Il rembourse les XP techniques déjà dépensés, puis débite le prix du jeton.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="hnk-chip">{rerollModal.costXp} XP</span>
              <span className="hnk-chip">Sans panier</span>
            </div>

            <div className="mt-5 hnk-shop-confirm-box space-y-3">
              <p>
                Réinitialisé : fiches techniques, invocations/Kuchiyose, Arts Shinobi, Kekkei Genkai, affinités et progression technique.
              </p>
              <p>
                Conservé : inventaire, rangs, profil RP, clan, trame, unité et titres.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <label className="flex items-start gap-3 text-sm text-bone">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={rerollModal.resetTechnique}
                  disabled={rerollModal.loading}
                  onChange={(e) => setRerollModal((current) => current ? { ...current, resetTechnique: e.target.checked, error: null } : current)}
                />
                <span>Je confirme que je veux remettre toute ma partie technique à zéro.</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-bone">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={rerollModal.refundAndCharge}
                  disabled={rerollModal.loading}
                  onChange={(e) => setRerollModal((current) => current ? { ...current, refundAndCharge: e.target.checked, error: null } : current)}
                />
                <span>Je comprends que les XP techniques seront remboursés avant le débit du jeton.</span>
              </label>
            </div>

            {rerollModal.error && <p className="mt-4 text-sm text-ember-hot">{rerollModal.error}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="hnk-btn-ghost"
                disabled={rerollModal.loading}
                onClick={() => setRerollModal(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="hnk-btn disabled:opacity-45"
                disabled={pending || rerollModal.loading || !rerollModal.resetTechnique || !rerollModal.refundAndCharge}
                onClick={buyRerollFt}
              >
                {rerollModal.loading ? "Réinitialisation..." : "Confirmer le reroll FT"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && checkoutNotice && createPortal(
        <div className="hnk-modal-backdrop" role="presentation" onClick={closeCheckoutNotice}>
          <div className="hnk-shop-unlock-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="hnk-eyebrow">Confirmation boutique</p>
                <h2>{checkoutNotice.title}</h2>
              </div>
              <span className="hnk-chip">{checkoutNotice.total} XP</span>
            </div>

            <div className="mt-5 hnk-shop-confirm-box">
              <p>{checkoutNotice.body}</p>
            </div>

            <div className="mt-5 flex justify-end">
              <button type="button" className="hnk-btn" onClick={closeCheckoutNotice}>
                J&apos;ai compris
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
