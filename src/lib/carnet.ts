// ============================================================
// Hi no Kuni — Générateur de CARNET DE BORD (Forumactif).
// Le carnet est un sujet vivant, consulté régulièrement par le membre
// et les autres joueurs : il DOIT passer par ce générateur pour ressortir
// de façon fiable et identique à chaque édition.
//
// Découpé en QUATRE générateurs indépendants (4 onglets, 4 codes forum à
// coller dans 4 messages d'un même sujet) :
//   1. Personnage      — identité, traits, caractère, ambitions
//   2. Liens           — relations (dupliquables, étoiles, RP communs)
//   3. Chronologie     — liste de RP (titre cliquable) + interludes texte
//   4. Accomplissements — exploits pour le village / clan / trame
//
// Chaque bloc est auto-suffisant : seulement des classes + une variable
// --clan inline. AUCUN <style> ni <script> dans le message → 100% compatible
// boîte de texte Forumactif. Réutilise la feuille hébergée
// public/forum/hnk-presentation.css (les classes .hnk-pres* + .hnk-cb*).
// ============================================================

import {
  FOUNDING_CLANS,
  CLAN_KEYS,
  CLAN_EMBLEMS,
  TRAMES,
  parseHnkRoot,
  nodeText,
  nodeMultiline,
  clanFromRoot,
  idPairs,
  type ClanKey,
} from "./presentation";

// Ré-exports pratiques pour le composant (un seul import côté UI).
export { FOUNDING_CLANS, CLAN_KEYS, CLAN_EMBLEMS, TRAMES };
export type { ClanKey };

// --- Grades de Konoha (liste fermée). ---
export const GRADES = ["Genin", "Chûnin", "Jônin"] as const;

// --- Sentiment d'un lien : pilote la couleur des étoiles. ---
export const SENTIMENTS = {
  allie: { label: "Apprécié / Allié" },
  neutre: { label: "Neutre / Ambigu" },
  ennemi: { label: "Détesté / Ennemi" },
} as const;
export type Sentiment = keyof typeof SENTIMENTS;

// --- Catégories d'accomplissement (cf. règles du forum). ---
export const ACC_CATEGORIES = {
  village: { label: "Village" },
  clan: { label: "Clan" },
  trame: { label: "Trame" },
  autre: { label: "Personnel" },
} as const;
export type AccCategory = keyof typeof ACC_CATEGORIES;

// ============================================================
//  MODÈLES DE DONNÉES
// ============================================================

export interface PersonnageData {
  avatarUrl: string;
  origine: string;
  naissance: string;
  trame: string; // "" = sans trame
  grade: string;
  // Traits particuliers
  voix: string;
  demarche: string;
  signes: string;
  traitsLibre: string;
  // Caractère
  qualites: string[];
  defauts: string[];
  // Ambitions (texte résumé)
  ambitions: string;
}

export interface LienRp {
  title: string;
  url: string;
}
export interface LienItem {
  avatarUrl: string;
  pseudo: string;
  nature: string;
  sentiment: Sentiment;
  force: number; // 0..5
  desc: string;
  rps: LienRp[];
}

export type ChronoItem =
  | { kind: "rp"; date: string; title: string; url: string; text: string }
  | { kind: "interlude"; title: string; text: string };

export interface AccItem {
  category: AccCategory;
  date: string;
  title: string;
  text: string;
}

export interface CarnetData {
  // Identité partagée par les 4 blocs (teinte + en-tête cohérents).
  clan: ClanKey;
  name: string;
  subtitle: string;
  personnage: PersonnageData;
  liens: LienItem[];
  chrono: ChronoItem[];
  accomplissements: AccItem[];
}

export type CarnetTab = "personnage" | "liens" | "chrono" | "accomplissements";

// ============================================================
//  ÉTATS VIDES
// ============================================================

export function emptyLien(): LienItem {
  return {
    avatarUrl: "",
    pseudo: "",
    nature: "",
    sentiment: "allie",
    force: 3,
    desc: "",
    rps: [{ title: "", url: "" }],
  };
}

export function emptyCarnet(): CarnetData {
  return {
    clan: "uchiha",
    name: "",
    subtitle: "",
    personnage: {
      avatarUrl: "",
      origine: "",
      naissance: "",
      trame: "",
      grade: "",
      voix: "",
      demarche: "",
      signes: "",
      traitsLibre: "",
      qualites: ["", ""],
      defauts: ["", ""],
      ambitions: "",
    },
    liens: [emptyLien()],
    chrono: [{ kind: "rp", date: "", title: "", url: "", text: "" }],
    accomplissements: [{ category: "village", date: "", title: "", text: "" }],
  };
}

// ============================================================
//  HELPERS HTML
// ============================================================

function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function multiline(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br>");
}
// Sécurise une URL collée dans un href (anti javascript:, data:, etc.).
function safeUrl(s: string): string {
  const u = (s ?? "").trim();
  if (!u) return "";
  if (/^(https?:\/\/|\/|#)/i.test(u)) return escapeHtml(u);
  return "";
}

function clanOf(c: CarnetData) {
  return FOUNDING_CLANS[c.clan] ?? FOUNDING_CLANS.uchiha;
}

// En-tête commun aux 4 blocs : kanji filigrane + crête du clan + sous-titre
// indiquant la section (« Carnet de bord · Liens », etc.).
function head(c: CarnetData, section: string): string {
  const name = c.name.trim() || "Nom du personnage";
  return (
    `<div class="hnk-pres-head">` +
    `<div class="kanji">火</div>` +
    `<div class="hnk-pres-emblem"></div>` +
    `<div class="hnk-pres-eyebrow">Carnet de bord · ${escapeHtml(section)}</div>` +
    `<h1 class="hnk-pres-name">${escapeHtml(name)}</h1>` +
    (c.subtitle.trim() ? `<div class="hnk-pres-sub">${escapeHtml(c.subtitle)}</div>` : "") +
    `</div>`
  );
}

function wrap(c: CarnetData, inner: string): string {
  const clan = clanOf(c);
  return (
    `<div class="hnk-pres hnk-pres--${c.clan}" style="--clan:${clan.color}">` +
    inner +
    `</div>`
  );
}

function stars(n: number, sentiment: Sentiment): string {
  const v = Math.max(0, Math.min(5, Math.round(n)));
  let cells = "";
  for (let i = 1; i <= 5; i++) {
    cells += `<span class="${i <= v ? "on" : ""}">${i <= v ? "★" : "☆"}</span>`;
  }
  return `<div class="hnk-cb-stars hnk-cb-stars--${sentiment}">${cells}</div>`;
}

// ============================================================
//  1) PERSONNAGE
// ============================================================

export function personnageForumHtml(c: CarnetData): string {
  const p = c.personnage;
  const clan = clanOf(c);
  const name = c.name.trim() || "Nom du personnage";

  // Identité : avatar 200×280 + liste de champs.
  const idRows = [
    ["Nom", name],
    ["Origine", p.origine],
    ["Naissance", p.naissance],
    ["Trame", p.trame],
    ["Clan", clan.label],
    ["Grade", p.grade],
  ]
    .filter(([, v]) => (v ?? "").toString().trim() !== "")
    .map(([k, v]) => `<li><span>${k}</span><b>${escapeHtml(v as string)}</b></li>`)
    .join("");

  const avatar = p.avatarUrl.trim()
    ? `<div class="hnk-pres-ava"><img src="${escapeHtml(p.avatarUrl)}" alt="${escapeHtml(name)}"></div>`
    : "";

  const idSec =
    `<div class="hnk-pres-sec">` +
    `<h2 class="hnk-pres-title">Personnage</h2>` +
    `<div class="hnk-pres-char">${avatar}<ul class="hnk-pres-id">${idRows}</ul></div>` +
    `</div>`;

  // Traits particuliers : champs structurés + texte libre.
  const traitRows = [
    ["Timbre de voix", p.voix],
    ["Démarche", p.demarche],
    ["Signes distinctifs", p.signes],
  ]
    .filter(([, v]) => (v ?? "").trim() !== "")
    .map(([k, v]) => `<li><span>${k}</span><b>${escapeHtml(v)}</b></li>`)
    .join("");
  const hasTraits = traitRows || p.traitsLibre.trim();
  const traitsSec = hasTraits
    ? `<div class="hnk-pres-sec">` +
      `<h2 class="hnk-pres-title">Traits particuliers</h2>` +
      (traitRows ? `<ul class="hnk-pres-id hnk-cb-id-full">${traitRows}</ul>` : "") +
      (p.traitsLibre.trim()
        ? `<div class="hnk-pres-traits"${traitRows ? ' style="margin-top:14px"' : ""}>${multiline(p.traitsLibre)}</div>`
        : "") +
      `</div>`
    : "";

  // Caractère : 2 colonnes (qualités / défauts).
  const qual = p.qualites.map((s) => s.trim()).filter(Boolean);
  const def = p.defauts.map((s) => s.trim()).filter(Boolean);
  const caracSec =
    qual.length || def.length
      ? `<div class="hnk-pres-sec">` +
        `<h2 class="hnk-pres-title">Caractère</h2>` +
        `<div class="hnk-cb-carac">` +
        `<div class="col col--q"><h3>Qualités</h3><ul>${qual
          .map((s) => `<li>${escapeHtml(s)}</li>`)
          .join("")}</ul></div>` +
        `<div class="col col--d"><h3>Défauts</h3><ul>${def
          .map((s) => `<li>${escapeHtml(s)}</li>`)
          .join("")}</ul></div>` +
        `</div></div>`
      : "";

  // Ambitions : bloc citation.
  const ambSec = p.ambitions.trim()
    ? `<div class="hnk-pres-sec">` +
      `<h2 class="hnk-pres-title">Ambitions</h2>` +
      `<div class="hnk-cb-amb">${multiline(p.ambitions)}</div>` +
      `</div>`
    : "";

  return wrap(c, head(c, "Personnage") + idSec + traitsSec + caracSec + ambSec);
}

// ============================================================
//  2) LIENS
// ============================================================

function lienCard(l: LienItem): string {
  const pseudo = l.pseudo.trim() || "Pseudo";
  const ava = l.avatarUrl.trim()
    ? `<div class="hnk-cb-link-ava"><img src="${escapeHtml(l.avatarUrl)}" alt="${escapeHtml(pseudo)}"></div>`
    : `<div class="hnk-cb-link-ava hnk-cb-link-ava--empty"></div>`;

  const rps = l.rps
    .filter((r) => r.title.trim() || r.url.trim())
    .map((r) => {
      const t = escapeHtml(r.title.trim() || "RP");
      const url = safeUrl(r.url);
      return url
        ? `<a href="${url}" target="_blank">${t}</a>`
        : `<span>${t}</span>`;
    })
    .join("");
  const rpBox = rps
    ? `<div class="hnk-cb-rplist">` +
      `<div class="hnk-cb-rplist-h">RP communs</div>` +
      `<div class="hnk-cb-rplist-b">${rps}</div>` +
      `</div>`
    : "";

  return (
    `<div class="hnk-cb-link">` +
    ava +
    `<div class="hnk-cb-link-body">` +
    `<div class="hnk-cb-link-top">` +
    `<div class="hnk-cb-link-id">` +
    `<b class="pseudo">${escapeHtml(pseudo)}</b>` +
    (l.nature.trim() ? `<span class="nature">${escapeHtml(l.nature)}</span>` : "") +
    `</div>` +
    stars(l.force, l.sentiment) +
    `</div>` +
    (l.desc.trim() ? `<p class="hnk-cb-link-desc">${multiline(l.desc)}</p>` : "") +
    rpBox +
    `</div>` +
    `</div>`
  );
}

export function liensForumHtml(c: CarnetData): string {
  const cards = c.liens
    .filter((l) => l.pseudo.trim() || l.nature.trim() || l.desc.trim() || l.avatarUrl.trim())
    .map(lienCard)
    .join("");
  const body = cards
    ? `<div class="hnk-pres-sec"><div class="hnk-cb-links">${cards}</div></div>`
    : `<div class="hnk-pres-sec"><p class="hnk-cb-empty">Aucun lien renseigné pour le moment.</p></div>`;
  return wrap(c, head(c, "Liens") + body);
}

// ============================================================
//  3) CHRONOLOGIE  (RP cliquables + interludes texte)
// ============================================================

export function chronoForumHtml(c: CarnetData): string {
  const items = c.chrono
    .map((it) => {
      if (it.kind === "interlude") {
        if (!it.title.trim() && !it.text.trim()) return "";
        return (
          `<div class="hnk-cb-interlude">` +
          `<span class="orn">◈</span>` +
          (it.title.trim() ? `<div class="t">${escapeHtml(it.title)}</div>` : "") +
          (it.text.trim() ? `<div class="x">${multiline(it.text)}</div>` : "") +
          `</div>`
        );
      }
      // RP
      if (!it.date.trim() && !it.title.trim() && !it.text.trim()) return "";
      const title = escapeHtml(it.title.trim() || "RP sans titre");
      const url = safeUrl(it.url);
      const lab = url
        ? `<a class="lab" href="${url}" target="_blank">${title}</a>`
        : `<span class="lab">${title}</span>`;
      return (
        `<div class="hnk-cb-ev">` +
        `<div class="hd">` +
        (it.date.trim() ? `<span class="yr">${escapeHtml(it.date)}</span>` : "") +
        lab +
        `</div>` +
        (it.text.trim() ? `<p>${multiline(it.text)}</p>` : "") +
        `</div>`
      );
    })
    .join("");

  const body = items
    ? `<div class="hnk-pres-sec"><div class="hnk-cb-time">${items}</div></div>`
    : `<div class="hnk-pres-sec"><p class="hnk-cb-empty">Aucune entrée pour le moment.</p></div>`;
  return wrap(c, head(c, "Chronologie") + body);
}

// ============================================================
//  4) ACCOMPLISSEMENTS
// ============================================================

export function accomplissementsForumHtml(c: CarnetData): string {
  const items = c.accomplissements
    .filter((a) => a.title.trim() || a.text.trim())
    .map((a) => {
      const cat = ACC_CATEGORIES[a.category] ?? ACC_CATEGORIES.autre;
      return (
        `<div class="hnk-cb-acc-item hnk-cb-acc--${a.category}">` +
        `<span class="cat">${escapeHtml(cat.label)}</span>` +
        `<div class="bd">` +
        `<div class="t">${escapeHtml(a.title.trim() || "Accomplissement")}` +
        (a.date.trim() ? ` <span class="dt">${escapeHtml(a.date)}</span>` : "") +
        `</div>` +
        (a.text.trim() ? `<p>${multiline(a.text)}</p>` : "") +
        `</div>` +
        `</div>`
      );
    })
    .join("");

  const body = items
    ? `<div class="hnk-pres-sec"><div class="hnk-cb-acc">${items}</div></div>`
    : `<div class="hnk-pres-sec"><p class="hnk-cb-empty">Aucun accomplissement pour le moment.</p></div>`;
  return wrap(c, head(c, "Accomplissements") + body);
}

// ============================================================
//  AIGUILLAGE PAR ONGLET
// ============================================================

export function carnetForumHtml(c: CarnetData, tab: CarnetTab): string {
  switch (tab) {
    case "personnage":
      return personnageForumHtml(c);
    case "liens":
      return liensForumHtml(c);
    case "chrono":
      return chronoForumHtml(c);
    case "accomplissements":
      return accomplissementsForumHtml(c);
  }
}

// ============================================================
//  IMPORT (inverse) — reconstruit un bloc depuis le code forum.
//  Le carnet est posté morceau par morceau : on importe UN bloc à la fois,
//  la section est détectée automatiquement (eyebrow « Carnet de bord · X »,
//  puis repli sur les classes). Parsing DOM → client uniquement.
// ============================================================

export interface CarnetBlockImport {
  section: CarnetTab;
  clan: ClanKey;
  name: string;
  subtitle: string;
  personnage?: PersonnageData;
  liens?: LienItem[];
  chrono?: ChronoItem[];
  accomplissements?: AccItem[];
}

function detectSection(root: Element): CarnetTab | null {
  const eb = nodeText(root.querySelector(".hnk-pres-eyebrow")).toLowerCase();
  if (eb.includes("personnage")) return "personnage";
  if (eb.includes("liens")) return "liens";
  if (eb.includes("chronolog")) return "chrono";
  if (eb.includes("accompl")) return "accomplissements";
  // Repli par classes (si l'eyebrow a été modifié).
  if (root.querySelector(".hnk-cb-links")) return "liens";
  if (root.querySelector(".hnk-cb-time")) return "chrono";
  if (root.querySelector(".hnk-cb-acc")) return "accomplissements";
  if (root.querySelector(".hnk-cb-carac, .hnk-cb-amb")) return "personnage";
  return null;
}

function parsePersonnageBlock(root: Element): PersonnageData {
  const base = emptyCarnet().personnage;
  const id = idPairs(root.querySelectorAll(".hnk-pres-char .hnk-pres-id li"));
  const tr = idPairs(root.querySelectorAll(".hnk-cb-id-full li"));
  const qualites = Array.from(root.querySelectorAll(".hnk-cb-carac .col--q li"))
    .map((li) => nodeText(li))
    .filter(Boolean);
  const defauts = Array.from(root.querySelectorAll(".hnk-cb-carac .col--d li"))
    .map((li) => nodeText(li))
    .filter(Boolean);
  return {
    ...base,
    avatarUrl: root.querySelector(".hnk-pres-ava img")?.getAttribute("src") ?? "",
    origine: id["origine"] ?? "",
    naissance: id["naissance"] ?? "",
    trame: id["trame"] ?? "",
    grade: id["grade"] ?? "",
    voix: tr["timbre de voix"] ?? "",
    demarche: tr["démarche"] ?? "",
    signes: tr["signes distinctifs"] ?? "",
    traitsLibre: nodeMultiline(root.querySelector(".hnk-pres-traits")),
    qualites: qualites.length ? qualites : ["", ""],
    defauts: defauts.length ? defauts : ["", ""],
    ambitions: nodeMultiline(root.querySelector(".hnk-cb-amb")),
  };
}

function parseLiensBlock(root: Element): LienItem[] {
  const out: LienItem[] = [];
  root.querySelectorAll(".hnk-cb-links .hnk-cb-link").forEach((card) => {
    const starsEl = card.querySelector(".hnk-cb-stars");
    let sentiment: Sentiment = "allie";
    if (starsEl?.classList.contains("hnk-cb-stars--ennemi")) sentiment = "ennemi";
    else if (starsEl?.classList.contains("hnk-cb-stars--neutre")) sentiment = "neutre";

    const rps: LienRp[] = [];
    const box = card.querySelector(".hnk-cb-rplist-b");
    if (box) {
      box.querySelectorAll(":scope > a, :scope > span").forEach((n) => {
        rps.push({
          title: nodeText(n),
          url: n.tagName === "A" ? n.getAttribute("href") ?? "" : "",
        });
      });
    }

    out.push({
      avatarUrl: card.querySelector(".hnk-cb-link-ava img")?.getAttribute("src") ?? "",
      pseudo: nodeText(card.querySelector(".pseudo")),
      nature: nodeText(card.querySelector(".nature")),
      sentiment,
      force: starsEl ? starsEl.querySelectorAll("span.on").length : 0,
      desc: nodeMultiline(card.querySelector(".hnk-cb-link-desc")),
      rps: rps.length ? rps : [{ title: "", url: "" }],
    });
  });
  return out.length ? out : [emptyLien()];
}

function parseChronoBlock(root: Element): ChronoItem[] {
  const items: ChronoItem[] = [];
  const time = root.querySelector(".hnk-cb-time");
  if (time) {
    time.querySelectorAll(":scope > .hnk-cb-ev, :scope > .hnk-cb-interlude").forEach((node) => {
      if (node.classList.contains("hnk-cb-interlude")) {
        items.push({
          kind: "interlude",
          title: nodeText(node.querySelector(".t")),
          text: nodeMultiline(node.querySelector(".x")),
        });
      } else {
        const lab = node.querySelector(".lab");
        items.push({
          kind: "rp",
          date: nodeText(node.querySelector(".yr")),
          title: nodeText(lab),
          url: lab?.getAttribute("href") ?? "",
          text: nodeMultiline(node.querySelector("p")),
        });
      }
    });
  }
  return items.length ? items : [{ kind: "rp", date: "", title: "", url: "", text: "" }];
}

function parseAccBlock(root: Element): AccItem[] {
  const out: AccItem[] = [];
  const cats = Object.keys(ACC_CATEGORIES) as AccCategory[];
  root.querySelectorAll(".hnk-cb-acc .hnk-cb-acc-item").forEach((item) => {
    let category: AccCategory = "autre";
    for (const c of cats) {
      if (item.classList.contains(`hnk-cb-acc--${c}`)) category = c;
    }
    const tEl = item.querySelector(".t");
    let date = "";
    let title = "";
    if (tEl) {
      date = nodeText(tEl.querySelector(".dt"));
      const clone = tEl.cloneNode(true) as Element;
      clone.querySelector(".dt")?.remove();
      title = nodeText(clone);
    }
    out.push({ category, date, title, text: nodeMultiline(item.querySelector("p")) });
  });
  return out.length ? out : [{ category: "village", date: "", title: "", text: "" }];
}

export function parseCarnetForumHtml(html: string): CarnetBlockImport | null {
  const root = parseHnkRoot(html);
  if (!root) return null;
  const section = detectSection(root);
  if (!section) return null;

  const block: CarnetBlockImport = {
    section,
    clan: clanFromRoot(root),
    name: nodeText(root.querySelector(".hnk-pres-name")),
    subtitle: nodeText(root.querySelector(".hnk-pres-sub")),
  };

  if (section === "personnage") block.personnage = parsePersonnageBlock(root);
  else if (section === "liens") block.liens = parseLiensBlock(root);
  else if (section === "chrono") block.chrono = parseChronoBlock(root);
  else block.accomplissements = parseAccBlock(root);

  return block;
}
