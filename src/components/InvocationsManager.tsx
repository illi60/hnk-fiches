"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ART_OPTIONS, ELEMENTS } from "@/lib/techniques";
import FicheForm from "@/components/FicheForm";

export interface InvTech {
  nom: string;
  description: string;
}
export interface InvFiche {
  id: string;
  nom: string;
  status: string;
  coutXp: number;
}
export interface Invocation {
  id: string;
  nom: string;
  espece: string | null;
  artShinobi: string | null;
  kekkeiGenkai: string | null;
  image: string | null;
  description: string | null;
  techniques: InvTech[];
  fiches: InvFiche[];
}

export interface FicheFormCtx {
  allowedKg: string[];
  allowedElements: string[];
  userClan: string | null;
  rangClan: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente",
  VALIDATED: "Validée",
  REJECTED: "Refusée",
};

export default function InvocationsManager({
  initial,
  pactAffinities,
  pactMaxSlots,
  pactSpecies,
  ermitePerfect,
  ownedKgs,
  ficheCtx,
}: {
  initial: Invocation[];
  pactAffinities: string[];
  pactMaxSlots: number;
  pactSpecies: string | null;
  ermitePerfect: boolean;
  ownedKgs: string[];
  ficheCtx: FicheFormCtx;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Invocation | "new" | null>(null);

  return (
    <div className="space-y-6">
      <PactAffinityPanel
        affinities={pactAffinities}
        maxSlots={pactMaxSlots}
        species={pactSpecies}
      />

      {editing ? (
        <InvocationForm
          value={editing === "new" ? null : editing}
          ermitePerfect={ermitePerfect}
          ownedKgs={ownedKgs}
          pactAffinities={pactAffinities}
          pactSpecies={pactSpecies}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : (
        <>
          <button type="button" className="hnk-btn" onClick={() => setEditing("new")}>
            + Nouvelle invocation
          </button>

          {initial.length === 0 ? (
            <p className="text-smoke italic">Aucune invocation. Scelle ton premier pacte.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {initial.map((inv) => (
                <InvocationCard
                  key={inv.id}
                  inv={inv}
                  pactAffinities={pactAffinities}
                  ermitePerfect={ermitePerfect}
                  ficheCtx={ficheCtx}
                  onEdit={() => setEditing(inv)}
                  onChanged={() => router.refresh()}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PactAffinityPanel({
  affinities,
  maxSlots,
  species,
}: {
  affinities: string[];
  maxSlots: number;
  species: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sel, setSel] = useState("");
  const [spec, setSpec] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const remaining = Math.max(0, maxSlots - affinities.length);
  const options = ELEMENTS.filter((e) => !affinities.some((a) => a.toLowerCase() === e.toLowerCase()));
  // L'espèce se fixe au tout premier verrouillage d'affinité (puis verrouillée).
  const needSpecies = !species && affinities.length === 0;

  function add() {
    if (!sel) return;
    if (needSpecies && !spec.trim()) {
      setErr("Renseigne l'espèce du pacte (elle sera verrouillée).");
      return;
    }
    setErr(null);
    start(async () => {
      const r = await fetch("/api/me/pact-affinity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affinity: sel, species: needSpecies ? spec.trim() : undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setErr(
          j.error === "ERMITE_REQUIS"
            ? "2e affinité réservée au pré-stade du Mode Ermite."
            : j.error === "DEUXIEME_DEJA_CHOISIE"
            ? "Les affinités du pacte sont déjà choisies."
            : "Choix impossible."
        );
        return;
      }
      setSel("");
      setSpec("");
      router.refresh();
    });
  }

  return (
    <div className="hnk-panel" data-kanji="盟">
      <p className="hnk-eyebrow">Pacte · affinité &amp; espèce verrouillées</p>
      <p className="text-[11px] text-smoke mt-2 leading-relaxed">
        L&apos;affinité et l&apos;espèce s&apos;appliquent à toute la race de ton pacte. Choix
        <span className="text-bone"> définitif</span> (l&apos;espèce se fixe au 1er choix d&apos;affinité).
        Une 2e affinité se débloque au pré-stade du Mode Ermite.
      </p>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {species && <span className="hnk-chip">Espèce · {species}</span>}
        {affinities.length === 0 && !species && (
          <span className="text-sm text-smoke italic">Aucune.</span>
        )}
        {affinities.map((a) => (
          <span key={a} className="hnk-chip">
            {a}
          </span>
        ))}
      </div>
      {remaining > 0 && (
        <div className="flex flex-wrap items-end gap-3 mt-4">
          {needSpecies && (
            <label className="block">
              <span className="hnk-label">Espèce du pacte</span>
              <input
                className="hnk-input"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                disabled={pending}
                maxLength={60}
                placeholder="ex. Crapauds, Serpents…"
              />
            </label>
          )}
          <label className="block">
            <span className="hnk-label">Choisir une affinité</span>
            <select
              className="hnk-input"
              value={sel}
              onChange={(e) => setSel(e.target.value)}
              disabled={pending}
            >
              <option value="">—</option>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="hnk-btn-ghost !py-2 !px-4 disabled:opacity-40"
            disabled={pending || !sel}
            onClick={add}
          >
            Verrouiller
          </button>
        </div>
      )}
      {err && <p className="text-sm text-ember-hot mt-3">{err}</p>}
    </div>
  );
}

function InvocationCard({
  inv,
  pactAffinities,
  ermitePerfect,
  ficheCtx,
  onEdit,
  onChanged,
}: {
  inv: Invocation;
  pactAffinities: string[];
  ermitePerfect: boolean;
  ficheCtx: FicheFormCtx;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();
  const [proposing, setProposing] = useState(false);

  function del() {
    if (!confirm(`Supprimer l'invocation « ${inv.nom} » ?`)) return;
    start(async () => {
      const r = await fetch(`/api/me/invocations/${inv.id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (j.ok) onChanged();
    });
  }

  return (
    <div className="hnk-panel" data-kanji="獣">
      <div className="flex gap-4">
        {inv.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={inv.image} alt={inv.nom} className="hnk-avatar w-20 h-20 flex-none" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display uppercase tracking-wider text-lg text-white">{inv.nom}</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            <Meta k="Espèce" v={inv.espece} />
            <Meta k="Affinité (pacte)" v={pactAffinities.join(", ") || null} />
            <Meta k="Art Shinobi" v={inv.artShinobi} />
            {inv.kekkeiGenkai && <Meta k="Kekkei Genkai" v={inv.kekkeiGenkai} />}
          </div>
        </div>
      </div>

      {inv.description && (
        <p className="text-sm text-bone/80 mt-3 whitespace-pre-line text-justify">{inv.description}</p>
      )}

      <div className="mt-4">
        <p className="hnk-eyebrow mb-2">Fiche technique</p>
        {inv.fiches.length === 0 && inv.techniques.length === 0 ? (
          <p className="text-xs text-smoke italic">Aucune technique.</p>
        ) : (
          <ul className="space-y-1.5">
            {inv.fiches.map((t) => (
              <li key={t.id} className="border-l border-ember/40 pl-3 py-0.5 flex justify-between gap-2">
                <span className="text-sm text-bone">{t.nom}</span>
                <span className="text-[10px] text-smoke uppercase tracking-wider">
                  {STATUS_LABEL[t.status] ?? t.status}
                  {t.coutXp ? ` · ${t.coutXp} XP` : ""}
                </span>
              </li>
            ))}
            {/* Anciennes techniques libres (legacy JSON) */}
            {inv.techniques.map((t, i) => (
              <li key={`legacy-${i}`} className="border-l border-white/10 pl-3 py-0.5">
                <p className="text-sm text-bone">{t.nom}</p>
                {t.description && <p className="text-xs text-smoke">{t.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {proposing ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="hnk-eyebrow mb-3">Proposer une technique de {inv.nom}</p>
          {!inv.artShinobi && !ermitePerfect && (
            <p className="text-sm text-ember-hot mb-3">
              Définis d&apos;abord l&apos;Art Shinobi de cette invocation (bouton « Éditer ») : une
              technique de kuchy ne peut être que de son Art.
            </p>
          )}
          <FicheForm
            invocationId={inv.id}
            invocationArt={inv.artShinobi}
            kuchyAllArts={ermitePerfect}
            allowedKg={ficheCtx.allowedKg}
            allowedElements={pactAffinities}
            userClan={ficheCtx.userClan}
            rangClan={ficheCtx.rangClan}
          />
          <button
            type="button"
            className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px] mt-3"
            onClick={() => setProposing(false)}
          >
            Fermer
          </button>
        </div>
      ) : (
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]"
            onClick={() => setProposing(true)}
          >
            + Proposer une technique
          </button>
          <button type="button" className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px]" onClick={onEdit}>
            Éditer
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={del}
            className="hnk-btn-ghost !py-1.5 !px-3 !text-[10px] !text-red-400 !border-red-500/40 disabled:opacity-40"
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string | null }) {
  return (
    <div>
      <p className="hnk-eyebrow">{k}</p>
      <p className="text-sm text-bone">{v && v.trim() ? v : "—"}</p>
    </div>
  );
}

function InvocationForm({
  value,
  ermitePerfect,
  ownedKgs,
  pactAffinities,
  pactSpecies,
  onClose,
  onSaved,
}: {
  value: Invocation | null;
  ermitePerfect: boolean;
  ownedKgs: string[];
  pactAffinities: string[];
  pactSpecies: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    nom: value?.nom ?? "",
    espece: value?.espece ?? "",
    artShinobi: value?.artShinobi ?? "",
    kekkeiGenkai: value?.kekkeiGenkai ?? "",
    image: value?.image ?? "",
    description: value?.description ?? "",
  });
  // Notes libres legacy : préservées telles quelles (plus d'édition — tout passe
  // désormais par « Proposer une technique » → validation).
  const [techs] = useState<InvTech[]>(value?.techniques ?? []);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  // Espèce verrouillée une fois définie (comme l'affinité de pacte).
  const especeLocked = !!value?.espece;

  function save() {
    if (!f.nom.trim()) {
      setErr("Le nom est requis.");
      return;
    }
    if (!pactSpecies && !especeLocked && !f.espece.trim()) {
      setErr("L'espèce est requise (elle sera verrouillée).");
      return;
    }
    setErr(null);
    const payload = {
      nom: f.nom.trim(),
      espece: f.espece.trim() || null,
      artShinobi: f.artShinobi.trim() || null,
      kekkeiGenkai: ermitePerfect ? f.kekkeiGenkai.trim() || null : null,
      image: f.image.trim(),
      description: f.description.trim() || null,
      techniques: techs
        .filter((t) => t.nom.trim())
        .map((t) => ({ nom: t.nom.trim(), description: t.description.trim() })),
    };
    const url = value ? `/api/me/invocations/${value.id}` : "/api/me/invocations";
    const method = value ? "PATCH" : "POST";
    start(async () => {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setErr(
          j.error === "MAX"
            ? "Nombre maximum d'invocations atteint."
            : j.error === "KUCHIYOSE_LOCKED"
            ? "Kuchiyose non débloqué."
            : "Enregistrement impossible."
        );
        return;
      }
      onSaved();
    });
  }

  return (
    <div className="hnk-panel" data-kanji="契">
      <h3 className="hnk-section-title">{value ? "Éditer l'invocation" : "Nouvelle invocation"}</h3>

      <p className="text-[11px] text-smoke mb-4">
        L&apos;affinité est héritée du pacte ({pactAffinities.join(", ") || "non définie"}). Chaque
        animal a son propre Art Shinobi.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <FieldInput label="Nom *" v={f.nom} on={(x) => setF((s) => ({ ...s, nom: x }))} />
        <FieldInput
          label={
            pactSpecies ? "Espèce (du pacte)" : especeLocked ? "Espèce (verrouillée)" : "Espèce *"
          }
          v={pactSpecies ?? f.espece}
          on={(x) => setF((s) => ({ ...s, espece: x }))}
          disabled={!!pactSpecies || especeLocked}
        />
        <label className="block">
          <span className="hnk-label">Art Shinobi</span>
          <select
            className="hnk-input"
            value={f.artShinobi}
            onChange={(e) => setF((s) => ({ ...s, artShinobi: e.target.value }))}
          >
            <option value="">—</option>
            {ART_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        {ermitePerfect && (
          <label className="block">
            <span className="hnk-label">Kekkei Genkai (Mode Ermite parfait · stade 3)</span>
            <select
              className="hnk-input"
              value={f.kekkeiGenkai}
              onChange={(e) => setF((s) => ({ ...s, kekkeiGenkai: e.target.value }))}
            >
              <option value="">—</option>
              {ownedKgs.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            {ownedKgs.length === 0 && (
              <span className="text-[10px] text-smoke">Tu n&apos;as aucun KG à partager.</span>
            )}
          </label>
        )}
        <FieldInput
          label="Image (URL)"
          v={f.image}
          on={(x) => setF((s) => ({ ...s, image: x }))}
          className="sm:col-span-2"
        />
      </div>

      <label className="block mt-4">
        <span className="hnk-label">Description</span>
        <textarea
          className="hnk-input"
          rows={3}
          value={f.description}
          onChange={(e) => setF((s) => ({ ...s, description: e.target.value }))}
        />
      </label>

      <p className="text-[11px] text-smoke mt-4">
        Les techniques de cette invocation se créent via « Proposer une technique » sur sa carte et
        passent par l&apos;étape de validation.
      </p>

      {err && <p className="text-sm text-ember-hot mt-3">{err}</p>}

      <div className="flex gap-3 mt-6">
        <button type="button" className="hnk-btn" disabled={pending} onClick={save}>
          {pending ? "…" : "Enregistrer"}
        </button>
        <button type="button" className="hnk-btn-ghost" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}

function FieldInput({
  label,
  v,
  on,
  className,
  disabled,
}: {
  label: string;
  v: string;
  on: (x: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="hnk-label">{label}</span>
      <input
        className="hnk-input"
        value={v}
        onChange={(e) => on(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}
