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
      setMsg(`${owner.itemName} retire de l'inventaire de ${holder}.`);
      router.refresh();
    });
  }

  return (
    <section className="hnk-panel" data-kanji="封">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="hnk-eyebrow">Objets permanents globaux</p>
          <h2 className="hnk-serif text-2xl mt-2">Detenteurs des reliques et contes</h2>
          <p className="text-sm text-smoke mt-3 max-w-2xl">
            Suis qui possede chaque relique ou conte. Retirer l'objet d'un inventaire le rend a nouveau
            disponible a l'achat pour tout le forum.
          </p>
        </div>
        <span className="hnk-chip">{totalOwned} attribution{totalOwned > 1 ? "s" : ""}</span>
      </div>

      <div className="mt-5 grid xl:grid-cols-2 gap-4">
        {relics.map((relic) => (
          <article key={relic.key} className="border border-white/10 bg-black/20 p-4" data-kanji={relic.kanji}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="hnk-eyebrow">{relic.key}</p>
                <h3 className="font-display uppercase tracking-wider text-xl text-white mt-2">{relic.name}</h3>
                <p className="text-xs text-smoke mt-1">{relic.category.replace(/_/g, " ").toLowerCase()}</p>
              </div>
              <span className="hnk-chip">{relic.owners.length ? "Attribue" : "Libre"}</span>
            </div>

            {relic.owners.length === 0 ? (
              <p className="text-sm text-smoke mt-4">Aucun joueur ne possede cet objet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {relic.owners.map((owner) => {
                  const holder = owner.user.forumPseudo || owner.user.username;
                  return (
                    <div key={owner.id} className="flex items-center justify-between gap-3 border border-white/10 bg-black/25 px-3 py-3">
                      <div>
                        <p className="text-sm text-bone font-semibold">{holder}</p>
                        <p className="text-xs text-smoke">
                          {owner.user.clan ? `${owner.user.clan} - ` : ""}
                          achete {owner.costXp} XP
                        </p>
                      </div>
                      <button
                        type="button"
                        className="hnk-btn-ghost !py-2 !px-3 !text-[10px]"
                        disabled={pending}
                        onClick={() => release(owner)}
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
      </div>

      {msg && <p className="text-sm text-bone mt-4">{msg}</p>}
    </section>
  );
}
