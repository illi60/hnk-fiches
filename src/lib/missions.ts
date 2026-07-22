// ============================================================
// Hi no Kuni - Generateur de missions (Forumactif).
// Produit une annonce de mission basee sur le gabarit .hnkf--mission fourni
// par le staff. Le message reste compatible Forumactif : classes + contenu.
// ============================================================

export const MISSION_RANKS = {
  e: { label: "E", name: "Corvée", color: "#8b8f98" },
  d: { label: "D", name: "Mineure", color: "#5fb36e" },
  c: { label: "C", name: "Standard", color: "#55a9ee" },
  b: { label: "B", name: "Périlleuse", color: "#a65cff" },
  a: { label: "A", name: "Critique", color: "#ff6732" },
  s: { label: "S", name: "Légendaire", color: "#ffc23c" },
} as const;

export type MissionRank = keyof typeof MISSION_RANKS;

export const MISSION_STATUSES = {
  ouverte: "Ouverte",
  reservee: "Réservée",
  completee: "Complétée",
  fermee: "Fermée",
} as const;

export type MissionStatus = keyof typeof MISSION_STATUSES;

export const PUBLIC_MISSION_RANKS: MissionRank[] = ["d", "c", "b"];
export const ADMIN_CONTRACT_RANKS: MissionRank[] = ["b", "a", "s"];

export interface MissionData {
  rank: MissionRank;
  urgency: string;
  status: MissionStatus;
  title: string;
  giver: string;
  location: string;
  reward: string;
  partySize: string;
  requiredGrade: string;
  description: string;
  conditionsTitle: string;
  conditions: string;
}

export function missionDefaultReward(rank: MissionRank): string {
  if (rank === "d") return "1 XP";
  if (rank === "c") return "3 XP";
  if (rank === "b") return "5 XP";
  return "";
}

export function missionDefaultPartySize(rank: MissionRank): string {
  if (rank === "b") return "3 shinobi minimum";
  return "2 shinobi minimum";
}

export function emptyMission(rank: MissionRank = "c"): MissionData {
  return {
    rank,
    urgency: MISSION_RANKS[rank]?.name ?? "Standard",
    status: "ouverte",
    title: "",
    giver: "",
    location: "",
    reward: missionDefaultReward(rank),
    partySize: missionDefaultPartySize(rank),
    requiredGrade: "",
    description: "",
    conditionsTitle: "Conditions",
    conditions: "",
  };
}

function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function richNotEmpty(html: string): boolean {
  if (!(html ?? "").trim()) return false;
  return html.replace(/<[^>]*>/g, "").trim().length > 0 || /<(img|a)\b/i.test(html);
}

export function missionForumHtml(d: MissionData, kind: "mission" | "contrat" = "mission"): string {
  const rank = MISSION_RANKS[d.rank] ?? MISSION_RANKS.c;
  const title = d.title.trim() || `Titre ${kind === "contrat" ? "du contrat" : "de la mission"}`;
  const urgency = d.urgency.trim() || rank.name;
  const status = MISSION_STATUSES[d.status] ?? MISSION_STATUSES.ouverte;
  const giver = d.giver.trim() || "Village/Clan/Individu";
  const conditionsTitle = d.conditionsTitle.trim() || "Conditions";

  const stats = ([
    ["Lieu", d.location || "Zone du RP"],
    ["Récompense", d.reward || "Récompense"],
    ["Effectif", d.partySize || "Nombre de shinobi requis"],
    ["Grade requis", d.requiredGrade || "Grade"],
  ] as [string, string][])
    .map(
      ([k, v]) =>
        `<div><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>`
    )
    .join("");

  const desc = richNotEmpty(d.description)
    ? `<div class="hnkf-ms-desc">${d.description}</div>`
    : `<div class="hnkf-ms-desc">Description ${kind === "contrat" ? "du contrat" : "de la mission"}.</div>`;
  const conditions = richNotEmpty(d.conditions)
    ? `<h2>${escapeHtml(conditionsTitle)}</h2><div class="hnkf-ms-desc">${d.conditions}</div>`
    : "";

  return (
    `<div class="hnkf hnkf--mission" data-rang="${d.rank}" style="--mission:${rank.color}">` +
    `<div class="hnkf-ms-frame">` +
    `<div class="hnkf-ms-seal"><span class="hnkf-ms-grade">${rank.label}</span><span class="hnkf-ms-kanji">任務</span></div>` +
    `<div class="hnkf-ms-content">` +
    `<div class="hnkf-ms-head"><span class="hnkf-ms-rk">Rang ${kind === "contrat" ? "du contrat" : "de la mission"} - ${escapeHtml(urgency)}</span>` +
    `<span class="hnkf-ms-status" data-state="${d.status}">${status}</span></div>` +
    `<h2 class="hnkf-ms-title">${escapeHtml(title)}</h2>` +
    `<span class="hnkf-ms-giver">Commanditaire · <b>${escapeHtml(giver)}</b></span>` +
    `<div class="hnkf-ms-stats">${stats}</div>` +
    desc +
    conditions +
    `</div></div></div>`
  );
}
