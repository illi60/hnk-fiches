// ============================================================
// Hi no Kuni - Generateur de messages d'administration.
// Produit un decret / avis staff compatible Forumactif.
// ============================================================

export const STAFF_MESSAGE_TYPES = {
  decret: "Décret officiel",
  avis: "Avis administratif",
  sanction: "Sanction officielle",
  event: "Annonce d'événement",
} as const;

export type StaffMessageType = keyof typeof STAFF_MESSAGE_TYPES;

export const STAFF_URGENCY_LEVELS = {
  normal: "Signalé",
  urgent: "Urgent",
  critique: "Critique",
} as const;

export type StaffUrgencyLevel = keyof typeof STAFF_URGENCY_LEVELS;

export interface StaffMetaField {
  label: string;
  value: string;
  enabled: boolean;
}

export interface StaffMessageData {
  type: StaffMessageType;
  seal: string;
  showUrgency: boolean;
  urgency: StaffUrgencyLevel;
  urgencyLabel: string;
  title: string;
  meta: StaffMetaField[];
  body: string;
  signature: string;
  stamp: string;
}

export function emptyStaffMessage(): StaffMessageData {
  return {
    type: "decret",
    seal: "Sceau N° VII · 003",
    showUrgency: true,
    urgency: "urgent",
    urgencyLabel: "Urgent",
    title: "",
    meta: [
      { label: "Émis par", value: "", enabled: true },
      { label: "Fonction", value: "", enabled: true },
      { label: "Date IG", value: "", enabled: true },
    ],
    body: "",
    signature: "忍 · 戦 · 影",
    stamp: "Sceau du Conseil",
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

function staffUrgencyInlineStyle(level: string): string {
  const bg = level === "normal" ? "#FFC23C" : level === "critique" ? "#C0473B" : "#FF5722";
  const fg = level === "critique" ? "#F5F1EA" : "#07080A";
  const glow = `box-shadow:0 0 16px ${bg}73;`;
  return [
    `box-sizing:border-box`,
    `display:inline-block`,
    `max-width:100%`,
    `text-align:center`,
    `white-space:normal`,
    `overflow-wrap:anywhere`,
    `word-break:normal`,
    `vertical-align:top`,
    `color:${fg}`,
    `background:${bg}`,
    glow,
  ]
    .filter(Boolean)
    .join(";");
}

function normalizeStaffBody(html: string): string {
  return html
    .replace(
      /<p([^>]*class="[^"]*\bhnkf-staff-point\b[^"]*"[^>]*)>([\s\S]*?)<\/p>/gi,
      `<div$1>$2</div>`
    )
    .replace(
      /<div([^>]*class="[^"]*\bhnkf-staff-point\b[^"]*"[^>]*)>/gi,
      (_match, attrs: string) =>
        `<div${attrs.replace(/\sstyle="[^"]*"/i, "")} style="text-align:center;margin:1.4em 0;">`
    )
    .replace(
      /<span([^>]*class="[^"]*\bhnkf-staff-urg\b[^"]*"[^>]*data-level="([^"]+)"[^>]*)>/gi,
      (_match, attrs: string, level: string) =>
        `<span${attrs.replace(/\sstyle="[^"]*"/i, "")} style="${staffUrgencyInlineStyle(level)}">`
    );
}

export function staffMessageForumHtml(d: StaffMessageData): string {
  const type = STAFF_MESSAGE_TYPES[d.type] ?? STAFF_MESSAGE_TYPES.decret;
  const title = d.title.trim() || "Titre du message";
  const seal = d.seal.trim() || "Sceau N° VII · 003";
  const urgencyLabel = d.urgencyLabel.trim() || STAFF_URGENCY_LEVELS[d.urgency];

  const meta = d.meta
    .filter((m) => m.enabled && m.value.trim())
    .map(
      (m) =>
        `<span><b>${escapeHtml(m.label.trim() || "Information")}</b>${escapeHtml(m.value.trim())}</span>`
    )
    .join("");

  const body = richNotEmpty(d.body)
    ? normalizeStaffBody(d.body)
    : "<p>Rédige ici le contenu du message administratif.</p>";

  const topUrgency = d.showUrgency
    ? `<span class="hnkf-staff-urg" data-level="${d.urgency}" style="${staffUrgencyInlineStyle(d.urgency)}">${escapeHtml(urgencyLabel)}</span>`
    : "";
  const metaBlock = meta ? `<div class="hnkf-staff-meta">${meta}</div>` : "";
  const foot = d.signature.trim() || d.stamp.trim()
    ? `<div class="hnkf-staff-foot"><span class="hnkf-staff-sign">${escapeHtml(d.signature.trim())}</span><span class="hnkf-staff-stamp">${escapeHtml(d.stamp.trim())}</span></div>`
    : "";

  return (
    `<div class="hnkf hnkf--staff" data-type="${d.type}">` +
    `<div class="hnkf-staff-frame">` +
    `<div class="hnkf-corners"></div>` +
    `<div class="hnkf-staff-top">` +
    `<div class="hnkf-seal">火</div>` +
    `<div class="hnkf-staff-id"><span class="hnkf-type">${escapeHtml(type)}</span><span class="hnkf-decree">${escapeHtml(seal)}</span></div>` +
    topUrgency +
    `</div>` +
    `<h2 class="hnkf-staff-title">${escapeHtml(title)}</h2>` +
    metaBlock +
    `<div class="hnkf-staff-body">${body}</div>` +
    foot +
    `</div></div>`
  );
}
