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
import { ARTS_ALL, specRank, invocationSpecRank, type ArtsState } from "@/lib/arts";

export interface FicheFormInitial {
  slug?: string;
  nom?: string;
  description?: string;
  art?: string;
  spec?: string;
  actionType?: string;
  secondarySpec?: string;
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
  artsState = null,
  villageRank = null,
  kgNames = KG_NAMES,
  kgColors,
  clanLibraryAccess = { kg: [], affinities: [] },
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
  artsState?: ArtsState | null; // état des Arts du joueur (pour afficher les rangs de spés)
  villageRank?: string | null; // rang de village du joueur
  kgNames?: string[];
  kgColors?: Record<string, string>;
  clanLibraryAccess?: { kg: string[]; affinities: string[] };
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
    spec: initial?.spec ?? "",
    secondaryArt: initial?.secondaryArt ?? "",
    secondarySpec: initial?.secondarySpec ?? "",
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

  // Art sélectionné → ArtDef correspondant (pour les spés + rangs).
  const artKey = v.art
    ? v.art.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    : null;
  const artDef = artKey ? ARTS_ALL.find((a) => a.key === artKey) : null;
  const secondaryArtKey = v.secondaryArt
    ? v.secondaryArt.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    : null;
  const secondaryArtDef = secondaryArtKey ? ARTS_ALL.find((a) => a.key === secondaryArtKey) : null;
  const showSpecRanks = artsState != null && villageRank != null;

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
  const kgPool = isTagTeam ? kgNames : allowedKg ?? kgNames;
  const elementPool = isTagTeam ? (ELEMENTS as readonly string[]) : allowedElements ?? ELEMENTS;
  const kgOptions = Array.from(new Set([...kgPool, ...(v.kekkeiGenkai ? [v.kekkeiGenkai] : [])]));
  const elementOptions = Array.from(
    new Set([...elementPool, ...(v.element ? [v.element] : [])])
  );
  // Kuchy : Art verrouillé sur celui de l'invocation, sauf Mode Ermite parfait.
  const artLocked = !!invocationId && !kuchyAllArts;

  // Technique de clan (nature COLLECTIVE) : KG/affinités autorisés par la bibliothèque.
  const clanKgName = clanKg(userClan);
  const collectiveKgOptions = Array.from(
    new Set([...(clanLibraryAccess.kg ?? []), ...(clanKgName ? [clanKgName] : [])])
  );
  const collectiveAffinityOptions = Array.from(new Set(clanLibraryAccess.affinities ?? []));
  const ownsSelectedCollectiveKg =
    !!v.kekkeiGenkai &&
    (allowedKg ?? []).some((k) => k.toLowerCase() === v.kekkeiGenkai.toLowerCase());
  const ownsSelectedCollectiveAffinity =
    !!v.element && (allowedElements ?? []).some((a) => a.toLowerCase() === v.element.toLowerCase());
  const selectedKgAllowed =
    !!v.kekkeiGenkai &&
    collectiveKgOptions.some((k) => k.toLowerCase() === v.kekkeiGenkai.toLowerCase());
  const selectedAffinityAllowed =
    !!v.element &&
    collectiveAffinityOptions.some((a) => a.toLowerCase() === v.element.toLowerCase());
  const resolvedKgColor = (name?: string | null) => (name ? kgColors?.[name] ?? kgColor(name) : kgColor(name));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    // Nature COLLECTIVE : être du clan + utiliser une option autorisée et possédée.
    if (v.nature === "COLLECTIVE") {
      if (!userClan) {
        setError("Tu dois appartenir à un clan pour créer une technique de clan.");
        return;
      }
      const usesAllowedKg =
        v.manifestation === "KEKKEI_GENKAI" &&
        !!v.kekkeiGenkai &&
        selectedKgAllowed &&
        ownsSelectedCollectiveKg;
      const usesAllowedAffinity =
        v.manifestation === "ELEMENT" &&
        !!v.element &&
        selectedAffinityAllowed &&
        ownsSelectedCollectiveAffinity;
      if (!usesAllowedKg && !usesAllowedAffinity) {
        setError("Choisis un KG ou une affinité autorisé(e) par la bibliothèque de ton clan, et que tu possèdes.");
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
      spec: v.spec || null,
      secondaryArt: v.actionType === "COMBINEE" ? v.secondaryArt || null : null,
      secondarySpec: v.actionType === "COMBINEE" ? v.secondarySpec || null : null,
      actionType: v.actionType || null,
      element: v.manifestation === "ELEMENT" ? v.element || null : null,
      kekkeiGenkai: isKuchy
        ? null
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
            onChange={(e) => setV((s) => ({ ...s, art: e.target.value, spec: "" }))}
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

      {/* Spécialisation : s'affiche quand un art est sélectionné */}
      {artDef && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Spécialisation">
            <select
              className="hnk-input"
              value={v.spec}
              onChange={(e) => up("spec", e.target.value)}
              disabled={disabled}
            >
              <option value="">—</option>
              {artDef.specs.map((specName, i) => {
                // Kuchy : la spé suit le rang global du joueur (auto, plafond B),
                // sans dépendre de l'artsState — l'invocation est une entité propre.
                const rank = isKuchy
                  ? villageRank != null
                    ? invocationSpecRank(villageRank)
                    : null
                  : showSpecRanks
                  ? specRank(artDef.key, i, artsState!, villageRank!)
                  : null;
                return (
                  <option key={specName} value={specName}>
                    {rank ? `${specName} — Rang ${rank}` : specName}
                  </option>
                );
              })}
            </select>
          </Field>
        </div>
      )}

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
              onChange={(e) => setV((s) => ({ ...s, secondaryArt: e.target.value, secondarySpec: "" }))}
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

          {secondaryArtDef && (
            <Field label="Spécialisation du 2e Art">
              <select
                className="hnk-input max-w-xs"
                value={v.secondarySpec}
                onChange={(e) => up("secondarySpec", e.target.value)}
                disabled={disabled}
              >
                <option value="">—</option>
                {secondaryArtDef.specs.map((specName, i) => {
                  const rank = isKuchy
                    ? villageRank != null
                      ? invocationSpecRank(villageRank)
                      : null
                    : showSpecRanks
                    ? specRank(secondaryArtDef.key, i, artsState!, villageRank!)
                    : null;
                  return (
                    <option key={specName} value={specName}>
                      {rank ? `${specName} — Rang ${rank}` : specName}
                    </option>
                  );
                })}
              </select>
            </Field>
          )}

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
                style={{
                  background: resolvedKgColor(v.kekkeiGenkai),
                  boxShadow: `0 0 8px ${resolvedKgColor(v.kekkeiGenkai)}`,
                }}
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
              clan. Elle doit utiliser un KG ou une affinité autorisé(e) par cette bibliothèque,
              et que ton personnage possède.
            </p>
            {!userClan ? (
              <p className="text-sm text-ember-hot">Aucun clan défini sur ta fiche — demande au staff.</p>
            ) : collectiveKgOptions.length === 0 && collectiveAffinityOptions.length === 0 ? (
              <p className="text-sm text-ember-hot">
                Aucun KG ou affinité autorisé pour la bibliothèque du clan {userClan}.
              </p>
            ) : (
              <>
                <p className="text-sm text-bone">
                  Clan : <span className="text-ember">{userClan}</span>
                </p>
                {collectiveKgOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-smoke">KG acceptés</span>
                    {collectiveKgOptions.map((kg) => (
                      <span
                        key={kg}
                        className="hnk-tech-chip"
                        style={{ color: resolvedKgColor(kg), borderColor: resolvedKgColor(kg) }}
                      >
                        {kg}
                      </span>
                    ))}
                  </div>
                )}
                {collectiveAffinityOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-smoke">
                      Affinités acceptées
                    </span>
                    {collectiveAffinityOptions.map((affinity) => (
                      <span key={affinity} className="hnk-tech-chip">
                        {affinity}
                      </span>
                    ))}
                  </div>
                )}
                {v.manifestation === "KEKKEI_GENKAI" && v.kekkeiGenkai && !selectedKgAllowed && (
                  <p className="text-sm text-ember-hot">
                    {v.kekkeiGenkai} n&apos;est pas autorisé dans cette bibliothèque de clan.
                  </p>
                )}
                {v.manifestation === "KEKKEI_GENKAI" && v.kekkeiGenkai && selectedKgAllowed && !ownsSelectedCollectiveKg && (
                  <p className="text-sm text-ember-hot">
                    Tu ne possèdes pas {v.kekkeiGenkai}.
                  </p>
                )}
                {v.manifestation === "ELEMENT" && v.element && !selectedAffinityAllowed && (
                  <p className="text-sm text-ember-hot">
                    {v.element} n&apos;est pas autorisée dans cette bibliothèque de clan.
                  </p>
                )}
                {v.manifestation === "ELEMENT" && v.element && selectedAffinityAllowed && !ownsSelectedCollectiveAffinity && (
                  <p className="text-sm text-ember-hot">
                    Tu ne possèdes pas l&apos;affinité {v.element}.
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
