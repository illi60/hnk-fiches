// ============================================================
// Hi no Kuni — Générateur de POST RP IN-GAME (Forumactif).
// Produit deux blocs auto-suffisants qui réutilisent la feuille hébergée
// public/forum/hnk-presentation.css (mêmes variables --clan, fonts, frame) :
//   1. la box du post RP (.hnk-rp) ;
//   2. une box « Résumé du tour » (.hnk-rp-turn), optionnelle.
// Aucun <style> ni <script> dans le message → 100% compatible boîte de
// texte Forumactif. La zone « Techniques utilisées » est un passe-plat
// (HTML brut) émis tel quel sous balises BBCode [hide]…[/hide].
// ============================================================

import {
  FOUNDING_CLANS,
  clanFromRoot,
  nodeInnerHtml,
  nodeText,
  type ClanKey,
} from "./presentation";

// Kanji décoratif FIXE affiché en filigrane vertical dans la bannière.
// (Volontairement non éditable côté joueur — modifier ici si besoin.)
export const RP_KANJI = "火の国";

// Bannière par défaut (porte de Konoha) : utilisée quand le champ est vide.
export const RP_DEFAULT_BANNER = "https://i.imgur.com/YmTenS8.png";

// Un participant = un joueur du RP : son pseudo + l'avatar (image) affiché
// dans la pastille ronde du pied de post.
export interface RpParticipant {
  pseudo: string;
  avatarUrl: string;
}

export interface RpPostData {
  clan: ClanKey; // teinte d'ambiance du post (variable --clan)
  banniereUrl: string; // image de bannière (haut du post)
  lieu: string; // sur-titre principal — « LIEU DU RP »
  tag: string; // sur-titre secondaire — « XXX » (date, moment, statut…)
  titre: string; // titre du RP
  citation: string; // petite citation en italique sous le titre
  corps: string; // texte enrichi du post (HTML sanitizé)
  participants: RpParticipant[]; // distribution affichée dans le pied
  type: string; // étiquette de type — « PV / LIBRE / EVENT »
  // ---- Deuxième box : « Résumé du tour » ----
  sante: string; // état de santé du personnage
  chakra: string; // « chakra » = nombre d'actions envoyées dans le combat
  actions: string; // résumé des actions (HTML enrichi sanitizé)
  techniques: string; // codes de techniques (HTML BRUT, passe-plat) → sous [hide]
}

export function emptyRpPost(): RpPostData {
  return {
    clan: "uchiha",
    banniereUrl: "",
    lieu: "",
    tag: "",
    titre: "",
    citation: "",
    corps: "",
    participants: [
      { pseudo: "", avatarUrl: "" },
      { pseudo: "", avatarUrl: "" },
    ],
    type: "",
    sante: "",
    chakra: "",
    actions: "",
    techniques: "",
  };
}

function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Vérifie qu'un champ HTML riche n'est pas vide (texte, image ou player présent).
function richNotEmpty(html: string): boolean {
  if (!(html ?? "").trim()) return false;
  return html.replace(/<[^>]*>/g, "").trim().length > 0 || /<(img|iframe)\b/i.test(html);
}

// Passe-plat « techniques » : HTML brut collé depuis la fiche technique.
// Non vide si du contenu visible OU au moins une balise (un codage) est présent.
function rawNotEmpty(html: string): boolean {
  if (!(html ?? "").trim()) return false;
  return html.replace(/<[^>]*>/g, "").trim().length > 0 || /<\w/.test(html);
}

export function rpForumHtml(d: RpPostData): string {
  const clan = FOUNDING_CLANS[d.clan] ?? FOUNDING_CLANS.uchiha;
  const titre = d.titre.trim() || "Titre du RP";

  // ---- Bannière : image bridée (cover) + voile dégradé + kanji filigrane FIXE.
  //      Champ vide → image par défaut (porte de Konoha).
  const bannerUrl = d.banniereUrl.trim() || RP_DEFAULT_BANNER;
  const bannerImg = `<img class="hnk-rp-banner-img" src="${escapeHtml(bannerUrl)}" alt="">`;

  const eyebrow =
    d.lieu.trim() || d.tag.trim()
      ? `<div class="hnk-rp-eyebrow">` +
        (d.lieu.trim() ? `<span class="loc">${escapeHtml(d.lieu)}</span>` : "") +
        (d.lieu.trim() && d.tag.trim() ? `<span class="sep"></span>` : "") +
        (d.tag.trim() ? `<span class="tag">${escapeHtml(d.tag)}</span>` : "") +
        `</div>`
      : "";

  const banner =
    `<div class="hnk-rp-banner">` +
    bannerImg +
    `<div class="hnk-rp-veil"></div>` +
    `<div class="hnk-rp-kanji">${escapeHtml(RP_KANJI)}</div>` +
    `<div class="hnk-rp-head">` +
    eyebrow +
    `<h1 class="hnk-rp-title">${escapeHtml(titre)}</h1>` +
    (d.citation.trim() ? `<div class="hnk-rp-cite">${escapeHtml(d.citation)}</div>` : "") +
    `</div>` +
    `</div>`;

  // ---- Corps : texte enrichi (police « story », justifié).
  const body = richNotEmpty(d.corps) ? `<div class="hnk-rp-body">${d.corps}</div>` : "";

  // ---- Pied : distribution (avatars + pseudos) à gauche, type à droite.
  // Un participant est identifié par son PSEUDO (l'avatar est optionnel). On
  // émet exactement AUTANT d'emblèmes que de noms → appariement fiable à
  // l'import (sinon un participant « avatar sans pseudo » décalerait tout).
  const cast = d.participants.filter((p) => p.pseudo.trim());
  const emblems = cast
    .map((p) =>
      p.avatarUrl.trim()
        ? `<span class="hnk-rp-emblem"><img src="${escapeHtml(p.avatarUrl)}" alt=""></span>`
        : `<span class="hnk-rp-emblem hnk-rp-emblem--empty"></span>`
    )
    .join("");
  const names = cast
    .map((p) => `<b>${escapeHtml(p.pseudo)}</b>`)
    .join(` <i>&amp;</i> `);
  const castBlock = cast.length
    ? `<div class="hnk-rp-cast">${emblems}<span class="hnk-rp-names">${names}</span></div>`
    : "";
  const typeBlock = d.type.trim()
    ? `<div class="hnk-rp-type">${escapeHtml(d.type)}</div>`
    : "";
  const foot =
    castBlock || typeBlock
      ? `<div class="hnk-rp-foot">${castBlock || "<span></span>"}${typeBlock}</div>`
      : "";

  const content =
    body || foot
      ? `<div class="hnk-rp-content"><div class="hnk-rp-rule"></div>${body}${foot}</div>`
      : "";

  const postBox =
    `<div class="hnk-pres hnk-pres--${d.clan} hnk-rp" style="--clan:${clan.color}">` +
    banner +
    content +
    `</div>`;

  // ============================================================
  //  DEUXIÈME BOX — « Résumé du tour » (santé, chakra, actions, techniques).
  //  Émise seulement si au moins un champ est renseigné.
  // ============================================================
  const statRows = ([
    ["Santé", d.sante],
    ["Chakra", d.chakra],
  ] as [string, string][])
    .filter(([, v]) => (v ?? "").trim() !== "")
    .map(
      ([k, v]) =>
        `<div class="hnk-rp-stat"><span class="k">${k}</span><b class="v">${escapeHtml(v)}</b></div>`
    )
    .join("");
  const statsBlock = statRows ? `<div class="hnk-rp-stats">${statRows}</div>` : "";

  const actionsBlock = richNotEmpty(d.actions)
    ? `<div class="hnk-rp-actions"><h3 class="hnk-rp-sub">Résumé des actions</h3><div class="tx">${d.actions}</div></div>`
    : "";

  // Techniques : passe-plat HTML brut, émis tel quel et MASQUÉ sous [hide].
  // Les balises BBCode [hide]…[/hide] enveloppent le <div> stylé DEPUIS
  // L'EXTÉRIEUR (et non depuis l'intérieur) : c'est la position la plus sûre
  // pour que le parseur Forumactif reconnaisse le tag autour du bloc HTML.
  const techBlock = rawNotEmpty(d.techniques)
    ? `<div class="hnk-rp-tech"><h3 class="hnk-rp-sub">Techniques utilisées</h3>` +
      `[hide]<div class="codes">${d.techniques}</div>[/hide]</div>`
    : "";

  const turnBox =
    statsBlock || actionsBlock || techBlock
      ? `<div class="hnk-pres hnk-pres--${d.clan} hnk-rp-turn" style="--clan:${clan.color}">` +
        `<div class="hnk-rp-turn-head"><div class="kanji">火</div>` +
        `<h2 class="hnk-rp-turn-title">Résumé du tour</h2></div>` +
        `<div class="hnk-rp-turn-body">${statsBlock}${actionsBlock}${techBlock}</div>` +
        `</div>`
      : "";

  return postBox + turnBox;
}

// ============================================================
//  IMPORT (inverse) — reconstruit les données depuis le code forum.
//  Sert à récupérer un post si la sauvegarde locale a sauté : on colle
//  le code, on récupère les champs. Parsing DOM → client uniquement
//  (DOMParser). Renvoie null si le code n'est pas un post RP.
// ============================================================
export function parseRpForumHtml(html: string): RpPostData | null {
  if (typeof DOMParser === "undefined") return null;
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, "text/html");
  } catch {
    return null;
  }
  // La box du post porte la classe .hnk-rp (la box résumé porte .hnk-rp-turn).
  const root = doc.querySelector(".hnk-rp");
  if (!root) return null;

  const base = emptyRpPost();

  // Distribution : on apparie avatars (img) et pseudos par position.
  const emblemEls = Array.from(root.querySelectorAll(".hnk-rp-cast .hnk-rp-emblem"));
  const nameEls = Array.from(root.querySelectorAll(".hnk-rp-names b"));
  const count = Math.max(emblemEls.length, nameEls.length);
  const participants: RpParticipant[] = [];
  for (let i = 0; i < count; i++) {
    const avatarUrl = emblemEls[i]?.querySelector("img")?.getAttribute("src") ?? "";
    participants.push({ pseudo: nodeText(nameEls[i]), avatarUrl });
  }

  // Deuxième box « Résumé du tour » (optionnelle).
  const turn = doc.querySelector(".hnk-rp-turn");
  let sante = "";
  let chakra = "";
  let actions = "";
  let techniques = "";
  if (turn) {
    turn.querySelectorAll(".hnk-rp-stat").forEach((st) => {
      const k = nodeText(st.querySelector(".k")).toLowerCase();
      const v = nodeText(st.querySelector(".v"));
      if (k.startsWith("sant")) sante = v;
      else if (k.startsWith("chakra")) chakra = v;
    });
    actions = nodeInnerHtml(turn.querySelector(".hnk-rp-actions .tx"));
    const codes = turn.querySelector(".hnk-rp-tech .codes");
    if (codes) {
      techniques = nodeInnerHtml(codes)
        .replace(/^\s*\[HIDE\]/i, "")
        .replace(/\[\/HIDE\]\s*$/i, "")
        .trim();
    }
  }

  return {
    clan: clanFromRoot(root),
    banniereUrl: root.querySelector(".hnk-rp-banner-img")?.getAttribute("src") ?? "",
    lieu: nodeText(root.querySelector(".hnk-rp-eyebrow .loc")),
    tag: nodeText(root.querySelector(".hnk-rp-eyebrow .tag")),
    titre: nodeText(root.querySelector(".hnk-rp-title")),
    citation: nodeText(root.querySelector(".hnk-rp-cite")),
    corps: nodeInnerHtml(root.querySelector(".hnk-rp-body")),
    participants: participants.length ? participants : base.participants,
    type: nodeText(root.querySelector(".hnk-rp-type")),
    sante,
    chakra,
    actions,
    techniques,
  };
}
