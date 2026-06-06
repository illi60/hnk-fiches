"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  ART_OPTIONS,
  ACTION_TYPES,
  ELEMENTS,
  MANIFESTATIONS,
  NATURES,
  ficheTotalCost,
  PERSONAL_SURCHARGE,
  type ManifestationKey,
} from "@/lib/techniques";
import { KG_NAMES, kgColor, clanKg } from "@/lib/kekkei";

export interface FicheFormInitial {
  slug?: string;
  nom?: string;
  description?: string;
  art?: string;
  actionType?: string;
  element?: string;
  kekkeiGenkai?: string;
  nature?: string;
  kinjutsuScope?: string;
  collaborators?: string[];
  secondaryArt?: string;
  secondaryElement?: string;
  secondaryKekkeiGenkai?: string;
  comment?: string;
}

export default function FicheForm({
  initial,
  ficheId,
  readOnly = false,
  allowedKg,
  allowedElements,
  userClan,
  rangClan,
  invocationId,
  invocationArt,
  kuchyAllArts = false,
}: {
  initial?: FicheFormInitial;
  ficheId?: string;
  readOnly?: boolean;
  allowedKg?: string[]; // KG réellement possédés ; défaut = catalogue complet
  allowedElements?: string[]; // affinités possédées ; défaut = 5 éléments
  userClan?: string | null; // clan du joueur (Nature COLLECTIVE)
  rangClan?: string | null; // Rang Clan (B+ → technique collective en duo)
  invocationId?: string; // si défini : technique de Kuchiyose rattachée à cette invocation
  invocationArt?: string | null; // Art Shinobi de l'invocation (verrouille l'Art de la technique)
  kuchyAllArts?: boolean; // Mode Ermite parfait : le kuchy accède à TOUS tes arts
}) {
  const router = useRouter();

  const initialManifestation: ManifestationKey = initial?.element
    ? "ELEMENT"
    : initial?.kekkeiGenkai
    ? "KEKKEI_GENKAI"
    : "AUCUNE";

  const [v, setV] = useState({
    nom: initial?.nom ?? "",
    description: initial?.description ?? "",
    art: invocationId ? invocationArt ?? "" : initial?.art ?? "",
    secondaryArt: initial?.secondaryArt ?? "",
    actionType: initial?.actionType ?? "",
    manifestation: initialManifestation as ManifestationKey,
    element: initial?.element ?? "",
    kekkeiGenkai: initial?.kekkeiGenkai ?? "",
    // 2e manifestation (COMBINEE) : x2 KG, KG/affi, ou x2 affi
    manifestation2: (initial?.secondaryElement
      ? "ELEMENT"
      : initial?.secondaryKekkeiGenkai
      ? "KEKKEI_GENKAI"
      : "AUCUNE") as ManifestationKey,
    secondaryElement: initial?.secondaryElement ?? "",
    secondaryKekkeiGenkai: initial?.secondaryKekkeiGenkai ?? "",
    nature: initial?.nature ?? "",
    collab0: initial?.collaborators?.[0] ?? "",
    collab1: initial?.collaborators?.[1] ?? "",
    comment: initial?.comment ?? "",
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  // Tag Team (type d'action COLLECTIVE) : technique jouée à plusieurs.
  const isTagTeam = v.actionType === "COLLECTIVE";
  // Duo (1 partenaire) possible si Rang Clan B+ ET même clan (vérifié au serveur) ;
  // sinon trio (2 partenaires).
  const duoAllowed = ["B", "A", "S"].includes((rangClan ?? "").toUpperCase());

  function up<K extends keyof typeof v>(k: K, val: (typeof v)[K]) {
    setV((s) => ({ ...s, [k]: val }));
  }

  // Konoha : pas de technique collective, pas de surcharge personnelle.
  const isKonoha = (userClan ?? "").toLowerCase().trim() === "konoha";
  // Natures disponibles selon le clan.
  const availableNatures = isKonoha ? NATURES.filter((n) => n.key !== "COLLECTIVE") : NATURES;

  // Techniques de Kuchiyose : pas de Kekkei Genkai, pas de surcharge personnelle.
  const isKuchy = !!invocationId;
  const manifestationOptions = isKuchy
    ? MANIFESTATIONS.filter((m) => m.key !== "KEKKEI_GENKAI")
    : MANIFESTATIONS;
  const cost = ficheTotalCost(v.actionType, isKuchy || isKonoha ? null : v.nature);
  const disabled = readOnly || pending;

  // KG / affinités : restreints à ceux du joueur, SAUF en Tag Team où l'on peut
  // utiliser ceux des partenaires (catalogue complet).
  const kgPool = isTagTeam ? KG_NAMES : allowedKg ?? KG_NAMES;
  const elementPool = isTagTeam ? (ELEMENTS as readonly string[]) : allowedElements ?? ELEMENTS;
  const kgOptions = Array.from(new Set([...kgPool, ...(v.kekkeiGenkai ? [v.kekkeiGenkai] : [])]));
  const elementOptions = Array.from(
    new Set([...elementPool, ...(v.element ? [v.element] : [])])
  );
  // Kuchy : Art verrouillé sur celui de l'invocation, sauf Mode Ermite parfait.
  const artLocked = !!invocationId && !kuchyAllArts;

  // Technique de clan (nature COLLECTIVE) : KG imposé = KG du clan, et le joueur
  // doit le posséder.
  const clanKgName = clanKg(userClan);
  const ownsClanKg =
    !!clanKgName && (allowedKg ?? []).some((k) => k.toLowerCase() === clanKgName.toLowerCase());

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    // Nature COLLECTIVE : être du clan + posséder le KG du clan.
    if (v.nature === "COLLECTIVE") {
      if (!userClan) {
        setError("Tu dois appartenir à un clan pour créer une technique de clan.");
        return;
      }
      if (!clanKgName) {
        setError("Ton clan n'a pas de Kekkei Genkai répertorié (clans : Hyuga, Uchiha, Senju, Sarutobi, Uzumaki).");
        return;
      }
      if (!ownsClanKg) {
        setError(`Tu dois posséder le ${clanKgName} de ton clan pour proposer une technique de clan.`);
        return;
      }
    }

    // Type d'action COLLECTIVE : pseudos des partenaires.
    let collaborators: string[] | undefined;
    if (v.actionType === "COLLECTIVE") {
      collaborators = [v.collab0, v.collab1].map((s) => s.trim()).filter(Boolean);
      const min = duoAllowed ? 1 : 2;
      if (collaborators.length < min) {
        setError(
          duoAllowed
            ? "Renseigne le pseudo exact d'au moins 1 partenaire."
            : "Renseigne le pseudo exact des 2 partenaires."
        );
        return;
      }
    }

    const payload = {
      nom: v.nom.trim(),
      description: v.description.trim(),
      art: v.art || null,
      secondaryArt: v.actionType === "COMBINEE" ? v.secondaryArt || null : null,
      actionType: v.actionType || null,
      element: v.manifestation === "ELEMENT" ? v.element || null : null,
      kekkeiGenkai: isKuchy
        ? null
        : v.nature === "COLLECTIVE"
        ? clanKgName // KG imposé du clan
        : v.manifestation === "KEKKEI_GENKAI"
        ? v.kekkeiGenkai.trim() || null
        : null,
      secondaryElement:
        v.actionType === "COMBINEE" && v.manifestation2 === "ELEMENT"
          ? v.secondaryElement || null
          : null,
      secondaryKekkeiGenkai:
        v.actionType === "COMBINEE" && v.manifestation2 === "KEKKEI_GENKAI"
          ? v.secondaryKekkeiGenkai.trim() || null
          : null,
      nature: isKuchy ? null : v.nature || null,
      collaborators,
      comment: v.comment.trim() || null,
      ...(invocationId ? { invocationId } : {}),
    };

    start(async () => {
      const res = await fetch(ficheId ? `/api/fiches/${ficheId}` : "/api/fiches", {
        method: ficheId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 409) setError("Slug déjà utilisé.");
        else if (res.status === 400) setError("Champs invalides.");
        else if (res.status === 429) setError("Trop de créations, attends un peu.");
        else setError("Erreur serveur.");
        return;
      }
      const json = await res.json();
      if (!ficheId && json.fiche?.id) router.push(`/technique/fiches/${json.fiche.id}`);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Nom de la technique">
        <input
          className="hnk-input"
          value={v.nom}
          onChange={(e) => up("nom", e.target.value)}
          disabled={disabled}
          required
          minLength={2}
          maxLength={120}
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label={
            isKuchy
              ? kuchyAllArts
                ? "Art Shinobi (Mode Ermite parfait : tous tes arts + le sien)"
                : "Art Shinobi de l'invocation"
              : "Art Shinobi"
          }
        >
          <select
            className="hnk-input"
            value={v.art}
            onChange={(e) => up("art", e.target.value)}
            disabled={disabled || artLocked}
          >
            <option value="">—</option>
            {ART_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`Type d'action${cost ? ` · ${cost} XP` : ""}`}>
          <select
            className="hnk-input"
            value={v.actionType}
            onChange={(e) => up("actionType", e.target.value)}
            disabled={disabled}
          >
            <option value="">—</option>
            {ACTION_TYPES.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label} — {a.cost} XP
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Genjutsu : rappel informatif (pas de hard-lock) */}
      {v.art === "Genjutsu" && (
        <div className="border border-ember/50 border-l-2 bg-ember/10 px-4 py-3 text-xs text-bone leading-relaxed">
          <span className="text-ember font-bold tracking-wider uppercase">⚠ Genjutsu</span> — pense à
          préciser les <strong>conditions de déclenchement et d&apos;efficacité</strong> (portée,
          sens visé, contre-mesures…) directement dans le <strong>corps de la description</strong>.
          Rappel informatif : aucun blocage, mais une technique sans conditions claires pourra être
          refusée à la validation.
        </div>
      )}

      {/* Type d'action COMBINEE : 2e composante (Art, et/ou 2e manifestation KG/affinité) */}
      {v.actionType === "COMBINEE" && (
        <div className="hnk-panel !p-4 space-y-4">
          <p className="text-[11px] text-smoke leading-relaxed">
            Combinaison : associe une 2e composante — <span className="text-bone">2e Art</span>,
            et/ou une <span className="text-bone">2e manifestation</span> (x2 affinité, x2 Kekkei
            Genkai, ou KG + affinité).
          </p>
          <Field label="2e Art Shinobi (optionnel)">
            <select
              className="hnk-input max-w-xs"
              value={v.secondaryArt}
              onChange={(e) => up("secondaryArt", e.target.value)}
              disabled={disabled}
            >
              <option value="">—</option>
              {ART_OPTIONS.filter((a) => a !== v.art).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <span className="hnk-label">2e manifestation</span>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
              {MANIFESTATIONS.map((m) => (
                <label key={m.key} className="flex items-center gap-2 text-sm text-bone cursor-pointer">
                  <input
                    type="radio"
                    name="manifestation2"
                    checked={v.manifestation2 === m.key}
                    onChange={() => up("manifestation2", m.key)}
                    disabled={disabled}
                    className="accent-[var(--ember)]"
                  />
                  {m.label}
                </label>
              ))}
            </div>
            {v.manifestation2 === "ELEMENT" && (
              <select
                className="hnk-input max-w-xs"
                value={v.secondaryElement}
                onChange={(e) => up("secondaryElement", e.target.value)}
                disabled={disabled}
              >
                <option value="">— Quelle affinité ?</option>
                {elementOptions.map((el) => (
                  <option key={el} value={el}>
                    {el}
                  </option>
                ))}
              </select>
            )}
            {v.manifestation2 === "KEKKEI_GENKAI" && (
              <select
                className="hnk-input max-w-xs"
                value={v.secondaryKekkeiGenkai}
                onChange={(e) => up("secondaryKekkeiGenkai", e.target.value)}
                disabled={disabled}
              >
                <option value="">— Quel Kekkei Genkai ?</option>
                {kgOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Type d'action COLLECTIVE : partenaires co-payeurs (pseudos exacts) */}
      {v.actionType === "COLLECTIVE" && (
        <div className="hnk-panel !p-4">
          <span className="hnk-label">Partenaires de la Tag Team</span>
          <p className="text-[11px] text-smoke mb-3 leading-relaxed">
            Renseigne le <span className="text-bone">pseudo EXACT</span> des autres participants. Le
            coût sera partagé à la validation. Tu peux utiliser les KG / Arts / affinités de tes
            partenaires.{" "}
            {duoAllowed
              ? "Duo possible (1 partenaire) si vous êtes du même clan ; sinon trio (2)."
              : "Trio requis : 2 partenaires (duo réservé au même clan + Rang Clan B)."}{" "}
            Un pseudo erroné entraîne le refus automatique.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="hnk-input"
              placeholder={`Pseudo partenaire 1${duoAllowed ? "" : " *"}`}
              value={v.collab0}
              onChange={(e) => up("collab0", e.target.value)}
              disabled={disabled}
              maxLength={24}
            />
            <input
              className="hnk-input"
              placeholder={`Pseudo partenaire 2${duoAllowed ? " (optionnel)" : " *"}`}
              value={v.collab1}
              onChange={(e) => up("collab1", e.target.value)}
              disabled={disabled}
              maxLength={24}
            />
          </div>
        </div>
      )}

      {/* Manifestation : aucune / élément / kekkei genkai */}
      <div className="hnk-panel !p-4">
        <span className="hnk-label">Manifestation</span>
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
          {manifestationOptions.map((m) => (
            <label key={m.key} className="flex items-center gap-2 text-sm text-bone cursor-pointer">
              <input
                type="radio"
                name="manifestation"
                checked={v.manifestation === m.key}
                onChange={() => up("manifestation", m.key)}
                disabled={disabled}
                className="accent-[var(--ember)]"
              />
              {m.label}
            </label>
          ))}
        </div>
        {v.manifestation === "ELEMENT" && (
          <select
            className="hnk-input max-w-xs"
            value={v.element}
            onChange={(e) => up("element", e.target.value)}
            disabled={disabled}
          >
            <option value="">— Quel élément ?</option>
            {elementOptions.map((el) => (
              <option key={el} value={el}>
                {el}
              </option>
            ))}
          </select>
        )}
        {v.manifestation === "KEKKEI_GENKAI" && (
          <div className="flex items-center gap-3">
            <select
              className="hnk-input max-w-xs"
              value={v.kekkeiGenkai}
              onChange={(e) => up("kekkeiGenkai", e.target.value)}
              disabled={disabled}
            >
              <option value="">— Quel Kekkei Genkai ?</option>
              {kgOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            {v.kekkeiGenkai && (
              <span
                className="inline-block w-4 h-4 rounded-sm flex-none"
                style={{ background: kgColor(v.kekkeiGenkai), boxShadow: `0 0 8px ${kgColor(v.kekkeiGenkai)}` }}
                title={v.kekkeiGenkai}
              />
            )}
          </div>
        )}
      </div>

      {/* Nature : personnelle / collective (clan) — sans objet pour le Kuchiyose */}
      {!isKuchy && (
      <div className="hnk-panel !p-4">
        <span className="hnk-label">Nature</span>
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
          {availableNatures.map((n) => (
            <label key={n.key} className="flex items-center gap-2 text-sm text-bone cursor-pointer">
              <input
                type="radio"
                name="nature"
                checked={v.nature === n.key}
                onChange={() => up("nature", n.key)}
                disabled={disabled}
                className="accent-[var(--ember)]"
              />
              {n.label}
              {n.key === "PERSONNELLE" && !isKonoha && (
                <span className="text-[10px] text-ember">(+{PERSONAL_SURCHARGE} XP)</span>
              )}
            </label>
          ))}
        </div>
        {v.nature === "COLLECTIVE" && (
          <div className="space-y-2">
            <p className="text-[11px] text-smoke leading-relaxed">
              Technique versée dans la <span className="text-bone">bibliothèque commune</span> de ton
              clan. Visible par tous les membres, utilisable seulement par ceux qui possèdent le
              Kekkei Genkai du clan.
            </p>
            {!userClan ? (
              <p className="text-sm text-ember-hot">Aucun clan défini sur ta fiche — demande au staff.</p>
            ) : !clanKgName ? (
              <p className="text-sm text-ember-hot">
                Clan « {userClan} » sans Kekkei Genkai répertorié.
              </p>
            ) : (
              <>
                <p className="text-sm text-bone">
                  Clan : <span className="text-ember">{userClan}</span> · KG du clan :{" "}
                  <span style={{ color: kgColor(clanKgName) }}>{clanKgName}</span>
                </p>
                {!ownsClanKg && (
                  <p className="text-sm text-ember-hot">
                    Tu ne possèdes pas le {clanKgName} — tu ne peux pas proposer de technique de ce clan.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
      )}

      <Field label="Description">
        <textarea
          className="hnk-input font-mono text-sm leading-relaxed"
          value={v.description}
          onChange={(e) => up("description", e.target.value)}
          disabled={disabled}
          required
          minLength={10}
          maxLength={20000}
          rows={10}
        />
      </Field>

      <Field label="Note pour le modérateur (optionnelle)">
        <textarea
          className="hnk-input text-sm"
          value={v.comment}
          onChange={(e) => up("comment", e.target.value)}
          disabled={disabled}
          maxLength={1000}
          rows={3}
          placeholder="Ex : technique gagnée gratuitement suite à un événement, précision sur le contexte RP…"
        />
        <p className="text-[10px] text-smoke mt-1">
          Visible uniquement par le staff. Disparaît automatiquement après validation ou refus.
        </p>
      </Field>

      {error && (
        <div className="text-sm text-ember-hot border border-ember/40 border-l-2 px-3 py-2 bg-ember/5">
          {error}
        </div>
      )}

      {!readOnly && (
        <div className="flex items-center gap-4">
          <button type="submit" disabled={pending} className="hnk-btn">
            {pending ? "Enregistrement…" : ficheId ? "Enregistrer" : "Créer le brouillon"}
          </button>
          <span className="text-xs text-smoke">
            Coût à la validation : <span className="text-ember tabular-nums">{cost} XP</span>
          </span>
        </div>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="hnk-label">{label}</span>
      {children}
    </label>
  );
}
