// Génère les règles CSS de crête par clan (blason en masque, teinté --clan)
// et les injecte dans public/forum/hnk-presentation.css entre les marqueurs
// /* CRESTS:START */ et /* CRESTS:END */.
//
//   npx tsx scripts/gen-crests.ts
//
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CLAN_EMBLEMS, CLAN_KEYS, FOUNDING_CLANS } from "../src/lib/presentation";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssPath = join(__dirname, "..", "public", "forum", "hnk-presentation.css");

function dataUri(svg: string): string {
  // utf8 + percent-encoding : robuste pour url() en background CSS.
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const rules = CLAN_KEYS.map((k) => {
  // Couleur du clan cuite dans le SVG (fill ET stroke) → image de fond colorée.
  let svg = CLAN_EMBLEMS[k].split("currentColor").join(FOUNDING_CLANS[k].color);
  // Filet de sécurité : un SVG en background-image DOIT déclarer le namespace,
  // sinon il ne décode pas (cas Hyûga/Uzumaki à l'origine).
  if (!svg.includes("xmlns")) {
    svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const uri = dataUri(svg);
  return `.hnk-pres--${k} .hnk-pres-emblem{background-image:url("${uri}")}`;
}).join("\n");

const css = readFileSync(cssPath, "utf8");
const start = "/* CRESTS:START */";
const end = "/* CRESTS:END */";
const re = new RegExp(
  `${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
);
const out = css.replace(re, `${start}\n${rules}\n${end}`);
writeFileSync(cssPath, out, "utf8");
console.log(`OK — ${CLAN_KEYS.length} crêtes injectées dans ${cssPath}`);
