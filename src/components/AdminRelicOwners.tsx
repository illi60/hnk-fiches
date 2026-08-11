"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface AdminRelicOwnerView {
  id: string;
  itemKey: string;
  itemName: string;
  costXp: number;
  quantity: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    forumPseudo?: string | null;
    clan?: string | null;
  };
}

export interface AdminRelicView {
  key: string;
  name: string;
  kanji: string;
  category: string;
  owners: AdminRelicOwnerView[];
}

export default function AdminRelicOwners({ relics }: { relics: AdminRelicView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const totalOwned = relics.reduce((sum, relic) => sum + relic.owners.length, 0);
  const reliques = relics.filter((item) => item.category === "RELIQUES");
  const contes = relics.filter((item) => item.category === "CONTES");

  function release(owner: AdminRelicOwnerView) {
    const holder = owner.user.forumPseudo || owner.user.username;
    if (!confirm(`Retirer "${owner.itemName}" de l'inventaire de ${holder} ?`)) return;

    setMsg(null);
    start(async () => {
      const res = await fetch(`/api/admin/shop-relic-owners/${owner.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg("Retrait impossible.");
        return;
      }
      setMsg(`${owner.itemName} retiré de l'inventaire de ${holder}.`);
      router.refresh();
    });
  }

  return (
    <section className="hnk-panel" data-kanji="封">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="hnk-eyebrow">Objets permanents globaux</p>
          <h2 className="hnk-serif text-2xl mt-2">Détenteurs des objets limités</h2>
          <p className="text-sm text-smoke mt-3 max-w-2xl">
            Suis qui possède chaque relique ou conte. Retirer l'objet d'un inventaire le rend à nouveau
            disponible à l'achat pour tout le forum.
          </p>
        </div>
        <span className="hnk-chip">{totalOwned} attribution{totalOwned > 1 ? "s" : ""}</span>
      </div>

      <OwnerGroup title="Reliques" kanji="遺" items={reliques} pending={pending} onRelease={release} />
      <OwnerGroup title="Contes" kanji="話" items={contes} pending={pending} onRelease={release} />

      {msg && <p className="text-sm text-bone mt-4">{msg}</p>}
    </section>
  );
}

function OwnerGroup({
  title,
  kanji,
  items,
  pending,
  onRelease,
}: {
  title: string;
  kanji: string;
  items: AdminRelicView[];
  pending: boolean;
  onRelease: (owner: AdminRelicOwnerView) => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 border-b border-ember/25 pb-2">
        <span className="text-ember font-display text-2xl leading-none">{kanji}</span>
        <h3 className="font-display uppercase tracking-wider text-xl text-white">{title}</h3>
        <span className="hnk-chip ml-auto">
          {items.reduce((sum, item) => sum + item.owners.length, 0)} détenu
          {items.reduce((sum, item) => sum + item.owners.length, 0) > 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-4 grid xl:grid-cols-2 gap-4">
        {items.map((item) => (
          <article key={item.key} className="border border-white/10 bg-black/20 p-4" data-kanji={item.kanji}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="hnk-eyebrow">{item.key}</p>
                <h4 className="font-display uppercase tracking-wider text-xl text-white mt-2">{item.name}</h4>
              </div>
              <span className="hnk-chip">{item.owners.length ? "Attribué" : "Libre"}</span>
            </div>

            {item.owners.length === 0 ? (
              <p className="text-sm text-smoke mt-4">Aucun joueur ne possède cet objet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {item.owners.map((owner) => {
                  const holder = owner.user.forumPseudo || owner.user.username;
                  return (
                    <div
                      key={owner.id}
                      className="flex items-center justify-between gap-3 border border-white/10 bg-black/25 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm text-bone font-semibold">{holder}</p>
                        <p className="text-xs text-smoke">
                          {owner.user.clan ? `${owner.user.clan} - ` : ""}
                          acheté {owner.costXp} XP
                        </p>
                      </div>
                      <button
                        type="button"
                        className="hnk-btn-ghost !py-2 !px-3 !text-[10px]"
                        disabled={pending}
                        onClick={() => onRelease(owner)}
                      >
                        Retirer
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        ))}

        {items.length === 0 && (
          <p className="text-sm text-smoke italic border border-white/10 bg-black/20 px-4 py-8">
            Aucun objet dans cette catégorie.
          </p>
        )}
      </div>
    </div>
  );
}
