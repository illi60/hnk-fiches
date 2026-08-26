// ============================================================
// Hi no Kuni - Generateur de jauge d'effort de guerre.
// Produit un bulletin staff compatible Forumactif : progression,
// objectifs et rapports RP ayant contribue a l'avancee commune.
// ============================================================

export const WAR_EFFORT_STATUSES = {
  en_cours: "Front actif",
  stabilise: "Front stabilise",
  accompli: "Objectif accompli",
  critique: "Situation critique",
} as const;

export type WarEffortStatus = keyof typeof WAR_EFFORT_STATUSES;

export const WAR_EFFORT_COLORS = {
  red: { label: "Rouge militaire", value: "#c0473b" },
  gold: { label: "Or de commandement", value: "#ffc23c" },
  steel: { label: "Acier bleute", value: "#55a9ee" },
  green: { label: "Vert operationnel", value: "#4fbf8f" },
} as const;

export type WarEffortColor = keyof typeof WAR_EFFORT_COLORS;

export interface WarEffortEntry {
  title: string;
  url: string;
  participants: string;
  theater: string;
  contribution: number;
  report: string;
}

export interface WarEffortData {
  title: string;
  subtitle: string;
  operation: string;
  command: string;
  status: WarEffortStatus;
  accent: WarEffortColor;
  objectiveLabel: string;
  current: number;
  target: number;
  entries: WarEffortEntry[];
  orders: string;
  stamp: string;
}

export function emptyWarEffort(): WarEffortData {
  return {
    title: "Effort de guerre",
    subtitle: "Bulletin de mobilisation collective",
    operation: "Operation Braise",
    command: "Etat-major de Konoha",
    status: "en_cours",
    accent: "red",
    objectiveLabel: "Ravitaillement du front",
    current: 0,
    target: 100,
    entries: [emptyWarEffortEntry()],
    orders: "",
    stamp: "Pour le feu et la ligne",
  };
}

export function emptyWarEffortEntry(): WarEffortEntry {
  return {
    title: "",
    url: "",
    participants: "",
    theater: "",
    contribution: 5,
    report: "",
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

function safeUrl(s: string): string {
  const u = (s ?? "").trim();
  if (!u) return "";
  if (/^(https?:\/\/|\/|#)/i.test(u)) return escapeHtml(u);
  return "";
}

export function clampWarEffortValue(value: number, target: number): number {
  const max = Math.max(1, Math.round(target || 1));
  return Math.max(0, Math.min(max, Math.round(value || 0)));
}

export function warEffortPercent(current: number, target: number): number {
  const max = Math.max(1, Math.round(target || 1));
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}

export function warEffortForumHtml(d: WarEffortData): string {
  const accent = WAR_EFFORT_COLORS[d.accent]?.value ?? WAR_EFFORT_COLORS.red.value;
  const status = WAR_EFFORT_STATUSES[d.status] ?? WAR_EFFORT_STATUSES.en_cours;
  const target = Math.max(1, Math.round(d.target || 1));
  const current = clampWarEffortValue(d.current, target);
  const percent = warEffortPercent(current, target);
  const title = d.title.trim() || "Effort de guerre";
  const objective = d.objectiveLabel.trim() || "Objectif strategique";

  const entries = d.entries
    .filter((entry) => entry.title.trim() || entry.participants.trim() || entry.theater.trim() || richNotEmpty(entry.report))
    .map((entry, index) => {
      const titleText = escapeHtml(entry.title.trim() || `Rapport de terrain ${index + 1}`);
      const url = safeUrl(entry.url);
      const titleNode = url
        ? `<a class="hnkf-war-rp-title" href="${url}" target="_blank">${titleText}</a>`
        : `<span class="hnkf-war-rp-title">${titleText}</span>`;
      const meta = [
        entry.participants.trim() ? `<span><b>Effectifs</b>${escapeHtml(entry.participants.trim())}</span>` : "",
        entry.theater.trim() ? `<span><b>Theatre</b>${escapeHtml(entry.theater.trim())}</span>` : "",
        `<span><b>Gain</b>+${Math.max(0, Math.round(entry.contribution || 0))} pts</span>`,
      ]
        .filter(Boolean)
        .join("");

      return (
        `<div class="hnkf-war-rp">` +
        `<div class="hnkf-war-rp-head"><span class="hnkf-war-rp-index">${String(index + 1).padStart(2, "0")}</span>${titleNode}</div>` +
        `<div class="hnkf-war-rp-meta">${meta}</div>` +
        (richNotEmpty(entry.report) ? `<div class="hnkf-war-rp-report">${entry.report}</div>` : "") +
        `</div>`
      );
    })
    .join("");

  const orders = richNotEmpty(d.orders)
    ? `<div class="hnkf-war-orders"><h3>Ordres en cours</h3><div>${d.orders}</div></div>`
    : "";

  return (
    `<div class="hnkf hnkf--war" data-state="${d.status}" style="--war:${accent};">` +
    `<div class="hnkf-war-frame">` +
    `<div class="hnkf-war-side"><span class="hnkf-war-kanji">戦</span><span class="hnkf-war-side-label">Mobilisation</span></div>` +
    `<div class="hnkf-war-content">` +
    `<div class="hnkf-war-top"><div><span class="hnkf-war-kicker">${escapeHtml(d.operation.trim() || "Operation")}</span><h2 class="hnkf-war-title">${escapeHtml(title)}</h2></div><span class="hnkf-war-status">${escapeHtml(status)}</span></div>` +
    (d.subtitle.trim() ? `<p class="hnkf-war-sub">${escapeHtml(d.subtitle.trim())}</p>` : "") +
    `<div class="hnkf-war-meta"><span><b>Commandement</b>${escapeHtml(d.command.trim() || "Etat-major")}</span><span><b>Objectif</b>${escapeHtml(objective)}</span></div>` +
    `<div class="hnkf-war-gauge" aria-label="${percent}%"><div class="hnkf-war-gauge-head"><span>Avancee operationnelle</span><b>${current}/${target}</b></div><div class="hnkf-war-track"><span style="width:${percent}%"></span></div><div class="hnkf-war-percent">${percent}% du seuil strategique</div></div>` +
    `<div class="hnkf-war-list"><h3>Rapports valides</h3>${entries || `<p class="hnkf-war-empty">Aucun rapport valide pour le moment.</p>`}</div>` +
    orders +
    (d.stamp.trim() ? `<div class="hnkf-war-stamp">${escapeHtml(d.stamp.trim())}</div>` : "") +
    `</div></div></div>`
  );
}

function warEffortStatusFromLabel(label: string): WarEffortStatus {
  const normalized = label.trim().toLowerCase();
  const found = Object.entries(WAR_EFFORT_STATUSES).find(([, value]) => value.toLowerCase() === normalized);
  return (found?.[0] as WarEffortStatus | undefined) ?? "en_cours";
}

function warEffortAccentFromValue(value: string): WarEffortColor {
  const normalized = value.trim().toLowerCase();
  const found = Object.entries(WAR_EFFORT_COLORS).find(([, color]) => color.value.toLowerCase() === normalized);
  return (found?.[0] as WarEffortColor | undefined) ?? "red";
}

function nodeText(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function nodeInnerHtml(el: Element | null | undefined): string {
  return (el?.innerHTML ?? "").trim();
}

function textWithoutFirstLabel(el: Element | null | undefined): string {
  if (!el) return "";
  const label = nodeText(el.querySelector("b"));
  return nodeText(el).replace(label, "").trim();
}

export function parseWarEffortForumHtml(html: string): WarEffortData | null {
  if (typeof DOMParser === "undefined") return null;
  let root: Element | null = null;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    root = doc.querySelector(".hnkf--war");
  } catch {
    return null;
  }
  if (!root) return null;

  const base = emptyWarEffort();
  const rawStatus = root.getAttribute("data-state") ?? "";
  const status =
    rawStatus in WAR_EFFORT_STATUSES
      ? (rawStatus as WarEffortStatus)
      : warEffortStatusFromLabel(nodeText(root.querySelector(".hnkf-war-status")));
  const styleAccent = root.getAttribute("style")?.match(/--war\s*:\s*([^;"]+)/i)?.[1] ?? "";
  const gaugeText = nodeText(root.querySelector(".hnkf-war-gauge-head b"));
  const gaugeMatch = gaugeText.match(/(\d+)\s*\/\s*(\d+)/);
  const target = Math.max(1, Number(gaugeMatch?.[2]) || base.target);

  const metaSpans = Array.from(root.querySelectorAll(".hnkf-war-meta span"));
  const command = textWithoutFirstLabel(metaSpans.find((span) => nodeText(span.querySelector("b")).toLowerCase() === "commandement"));
  const objectiveLabel = textWithoutFirstLabel(metaSpans.find((span) => nodeText(span.querySelector("b")).toLowerCase() === "objectif"));

  const entries = Array.from(root.querySelectorAll(".hnkf-war-rp")).map((rp) => {
    const titleNode = rp.querySelector(".hnkf-war-rp-title");
    const meta = Array.from(rp.querySelectorAll(".hnkf-war-rp-meta span"));
    const valueFor = (label: string) =>
      textWithoutFirstLabel(meta.find((span) => nodeText(span.querySelector("b")).toLowerCase() === label));
    const gainText = valueFor("gain");
    const contribution = Math.max(0, Number(gainText.match(/(\d+)/)?.[1]) || 0);
    return {
      title: nodeText(titleNode),
      url: titleNode instanceof HTMLAnchorElement ? titleNode.getAttribute("href") ?? "" : "",
      participants: valueFor("effectifs"),
      theater: valueFor("theatre"),
      contribution,
      report: nodeInnerHtml(rp.querySelector(".hnkf-war-rp-report")),
    };
  });

  return {
    ...base,
    title: nodeText(root.querySelector(".hnkf-war-title")) || base.title,
    subtitle: nodeText(root.querySelector(".hnkf-war-sub")),
    operation: nodeText(root.querySelector(".hnkf-war-kicker")) || base.operation,
    command: command || base.command,
    status,
    accent: warEffortAccentFromValue(styleAccent),
    objectiveLabel: objectiveLabel || base.objectiveLabel,
    current: clampWarEffortValue(Number(gaugeMatch?.[1]) || 0, target),
    target,
    entries: entries.length ? entries : base.entries,
    orders: nodeInnerHtml(root.querySelector(".hnkf-war-orders > div")),
    stamp: nodeText(root.querySelector(".hnkf-war-stamp")),
  };
}
