// ============================================================
// Hi no Kuni — Générateur de fiche de PRÉSENTATION (Forumactif).
// Produit un bloc <div class="hnk-pres">…</div> auto-suffisant qui
// s'appuie sur la feuille hébergée public/forum/hnk-presentation.css
// (importée une fois dans la CSS du forum). Aucun <style> ni <script>
// dans le message → 100% compatible boîte de texte Forumactif.
// ============================================================

// --- Clans / groupes représentés : couleur de fond + emblème.
//     Les 5 clans fondateurs (palette canonique du registre js_clans)
//     + le groupe "Shinobis simples" (sans clan fondateur, emblème de Konoha).
export const FOUNDING_CLANS = {
  uchiha: { label: "Uchiha", color: "#C0392B", kanji: "火" },
  hyuga: { label: "Hyûga", color: "#8E7CC3", kanji: "白" },
  senju: { label: "Senju", color: "#3FA34D", kanji: "木" },
  uzumaki: { label: "Uzumaki", color: "#E67E22", kanji: "渦" },
  sarutobi: { label: "Sarutobi", color: "#C99B3A", kanji: "猿" },
  konoha: { label: "Shinobis simples", color: "#5E83A8", kanji: "木" },
} as const;

export type ClanKey = keyof typeof FOUNDING_CLANS;
export const CLAN_KEYS = Object.keys(FOUNDING_CLANS) as ClanKey[];

// --- Blasons des clans (SVG `currentColor`, repris du registre js_clans).
//     Utilisés tels quels dans le sélecteur de l'éditeur (app React) et,
//     via masque CSS dans la feuille hébergée, comme crête sur la fiche.
export const CLAN_EMBLEMS: Record<ClanKey, string> = {
  uchiha:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" fill="none"><path d="M236 215L221 217L195 224L162 240L139 257L122 274L102 300L120 328L134 343L151 357L185 376L223 387L208 522L278 522L279 524L287 523L285 520L275 387L297 382L319 374L347 358L376 332L399 299L394 299L387 287L366 263L344 245L328 235L306 225L282 218L263 215L237 215ZM249 209L249 210ZM236 65L203 71L183 78L160 90L132 112L108 142L100 156L90 182L84 216L86 253L91 274L98 292L100 293L113 274L130 256L151 239L167 229L203 214L220 210L251 207L272 209L295 214L315 221L333 230L364 252L382 270L399 294L401 293L406 281L414 250L415 211L412 192L405 169L395 148L384 131L356 102L341 91L321 80L300 72L279 67L263 65L237 65Z" fill="currentColor" fill-rule="evenodd"/></svg>',
  hyuga:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><path d="M 6 14 C 8 8, 14 8, 14 14 L 32 52 L 50 14 C 50 8, 56 8, 58 14" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M 32 16 C 28 22, 24 28, 28 34 C 30 38, 36 38, 36 32 C 36 28, 32 27, 31 30 C 30.3 32, 33 33, 33 31" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  sarutobi:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 1800" fill="none"><path d="M894 394L871 397L848 404L824 416L804 432L790 447L776 469L766 494L761 520L761 547L765 569L772 589L779 603L790 619L800 631L827 652L852 664L872 670L873 669L875 671L875 854L873 856L845 853L813 846L780 835L755 824L724 807L699 790L683 778L651 747L673 723L683 707L691 689L698 652L696 624L688 598L680 582L667 564L648 546L619 529L591 521L556 520L521 529L496 543L480 556L470 567L456 589L445 619L442 639L442 656L448 687L459 711L472 730L488 746L504 757L536 771L558 775L589 774L613 767L656 809L684 830L725 855L754 869L800 885L840 894L871 897L875 899L875 970L873 972L838 976L808 983L778 993L744 1008L710 1028L685 1046L655 1072L642 1086L622 1081L604 1079L579 1081L555 1088L541 1095L525 1106L509 1122L498 1138L488 1160L483 1181L482 1205L485 1224L492 1245L500 1260L512 1276L535 1296L556 1307L575 1313L597 1316L626 1313L645 1307L666 1296L682 1283L699 1263L711 1239L718 1210L718 1184L715 1168L708 1148L696 1128L680 1111L679 1107L699 1088L723 1069L755 1049L773 1040L805 1027L830 1020L873 1013L875 1015L875 1389L883 1402L896 1408L907 1407L916 1402L921 1396L925 1384L924 1015L926 1013L954 1017L979 1023L1027 1041L1073 1068L1100 1089L1119 1107L1119 1110L1106 1123L1096 1137L1086 1158L1080 1184L1080 1210L1082 1223L1088 1242L1099 1263L1112 1279L1132 1296L1151 1306L1176 1314L1202 1316L1223 1313L1240 1308L1263 1296L1287 1275L1301 1255L1311 1232L1316 1207L1314 1175L1307 1152L1299 1136L1289 1122L1273 1106L1257 1095L1243 1088L1213 1080L1183 1080L1157 1087L1130 1060L1109 1043L1085 1026L1052 1007L1015 991L990 983L960 976L926 972L924 969L924 899L926 897L946 896L975 891L1016 880L1045 869L1080 852L1114 831L1143 809L1185 768L1218 775L1241 775L1272 768L1295 757L1311 746L1325 732L1344 704L1351 687L1355 671L1357 637L1351 608L1335 575L1316 553L1287 533L1256 522L1227 519L1191 525L1166 536L1144 552L1123 576L1111 598L1102 632L1102 663L1109 691L1124 720L1136 735L1148 746L1146 750L1112 781L1089 798L1067 812L1036 828L986 846L954 853L926 856L924 854L924 671L950 663L977 649L999 631L1015 611L1028 587L1034 570L1038 548L1038 518L1033 494L1022 467L1009 447L987 425L966 411L949 403L929 397L895 394ZM1192 1130L1202 1129L1218 1132L1239 1143L1250 1153L1258 1165L1262 1173L1266 1190L1264 1215L1259 1228L1252 1239L1245 1247L1230 1258L1218 1263L1203 1266L1192 1266L1178 1263L1164 1257L1154 1250L1138 1231L1133 1220L1130 1207L1130 1187L1133 1174L1144 1155L1162 1139L1174 1133L1191 1130ZM594 1130L613 1130L638 1140L654 1155L660 1164L668 1187L668 1207L666 1217L660 1231L653 1241L634 1257L617 1264L605 1266L584 1264L575 1261L558 1251L541 1232L537 1224L532 1205L532 1189L534 1180L537 1171L546 1156L553 1148L566 1138L580 1132L593 1130ZM1225 570L1241 570L1259 575L1281 589L1290 598L1298 610L1303 621L1307 638L1306 663L1302 676L1292 694L1281 706L1270 714L1258 720L1239 725L1220 725L1206 722L1190 715L1179 707L1169 697L1160 684L1156 675L1151 653L1152 635L1157 617L1173 593L1182 585L1199 575L1212 571L1224 570ZM566 570L581 570L600 575L622 589L638 609L645 625L648 640L646 666L640 682L630 697L609 715L596 721L580 725L560 725L546 722L531 715L521 708L512 700L502 686L495 670L492 655L492 639L495 625L501 610L510 597L523 585L540 575L553 571L565 570ZM893 445L906 444L926 448L941 454L956 464L968 476L979 492L986 510L989 527L988 547L983 565L975 581L966 593L957 602L942 612L922 620L911 622L888 622L874 619L857 612L844 603L833 593L821 576L814 559L810 538L811 519L816 501L825 484L832 475L853 457L873 448L892 445Z" fill="currentColor" fill-rule="evenodd"/></svg>',
  senju:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 400" fill="none"><path d="M748 8L718 12L692 21L663 38L639 61L621 86L606 121L600 149L597 189L491 188L490 105L475 105L474 188L358 189L356 158L351 130L345 111L335 90L314 61L299 46L278 31L262 23L236 14L192 10L156 15L136 22L105 39L81 59L44 116L30 127L14 133L5 150L30 142L48 131L70 108L89 82L102 69L120 56L156 41L174 37L202 35L234 39L258 53L280 74L296 96L308 119L316 140L323 168L325 181L324 190L282 191L280 167L273 143L262 125L247 109L231 98L209 89L186 85L165 85L137 91L121 98L105 108L95 118L77 144L68 152L54 157L49 167L67 162L77 156L112 120L131 109L159 101L189 100L200 102L214 109L229 121L237 130L247 145L255 163L259 177L260 192L8 200L8 202L22 203L259 208L261 210L257 232L253 243L242 262L230 275L218 284L209 289L193 294L163 294L132 286L109 272L78 239L68 233L49 227L54 237L69 243L79 253L97 279L104 286L126 300L142 306L157 309L198 308L219 302L232 296L245 287L261 271L268 261L278 237L282 209L326 211L325 233L318 267L311 286L294 316L286 326L262 348L239 361L219 366L183 366L164 363L144 357L120 346L102 333L89 320L70 294L48 271L30 260L5 252L14 269L30 275L44 286L78 339L91 353L117 372L132 380L155 388L173 391L212 391L236 388L262 379L278 371L300 355L326 326L342 298L353 263L356 244L358 210L474 212L475 300L490 300L491 212L597 211L599 240L603 265L617 304L630 325L646 344L659 356L676 368L710 383L721 386L747 389L778 389L798 386L820 379L839 369L860 354L873 342L910 285L921 275L942 266L950 250L929 256L908 268L889 287L863 321L849 334L836 343L818 352L798 359L769 364L740 364L722 361L703 352L687 341L672 327L654 303L643 281L634 253L630 230L629 211L673 209L678 238L685 255L697 272L713 287L732 298L753 305L770 307L803 306L824 300L852 283L879 247L889 239L901 235L906 225L891 229L878 236L863 250L850 266L827 282L797 291L765 292L758 291L741 284L729 276L715 262L701 238L695 216L696 209L951 202L951 200L930 199L695 192L694 188L696 175L701 158L709 141L717 129L739 108L754 100L763 98L798 99L825 107L847 121L877 153L889 160L906 165L901 155L886 149L876 139L852 107L824 91L810 86L794 83L766 83L752 85L734 91L720 98L710 105L695 120L686 133L676 160L674 190L630 190L632 166L639 138L646 119L662 89L673 74L698 50L718 38L733 34L764 33L783 35L812 43L832 52L851 65L869 83L887 108L904 126L926 140L950 148L942 131L924 124L909 111L875 58L868 50L849 36L822 21L800 13L771 8L749 8Z" fill="currentColor" fill-rule="evenodd"/></svg>',
  uzumaki:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="3"/><path d="M32 14 A 18 18 0 1 1 14 32 A 14 14 0 1 1 42 32 A 10 10 0 1 1 22 32 A 6 6 0 1 1 34 32" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="square"/></svg>',
  konoha:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><g fill="none" stroke="currentColor" stroke-width="4.20699" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" transform="matrix(1.35911,0,0,1.3562,265.674,124.785)"><path d="M -142.125,-55.25 C -140.875,-54.666667 -139.4375,-53.9375 -139.875,-49.875 C -141.1875,-46.3125 -143.6875,-43.270833 -150,-43.5 C -155.0625,-44.729167 -160.5625,-46.166667 -160.125,-56.25 C -159.6875,-61.458333 -154.25,-68.6875 -145,-68.75 C -131.625,-68.5625 -125.0625,-56.75 -125.625,-47.625 C -126.3125,-34.625 -136.70833,-27.875 -151,-26.625 C -158.66667,-26.625 -167.5625,-30.8125 -171.625,-37.125 C -176.6875,-43.6875 -178.64583,-57.208333 -174.375,-66.125 C -169.85417,-75.666667 -161.3244,-81.672042 -151.25,-81.875 C -141.89583,-82.0625 -135.75,-78.541667 -132.25,-76.375 L -124,-84.375"/><path d="M -172.625,-69.25 C -177.5736,-61.537772 -180.88532,-51.495796 -184.25,-45.375 C -186.66667,-40.125 -189.95833,-37.125 -193.375,-33.125 C -179.80766,-25.257434 -158.89934,-24.622727 -145.3125,-27.4375"/></g></svg>',
};

// --- Trames (« départs avancés »), regroupées par axe stratégique de Konoha.
//     "" = sans trame (sans départ avancé).
export interface TrameGroup {
  axe: string;
  trames: string[];
}
export const TRAMES: TrameGroup[] = [
  {
    axe: "Axe I — La Grande Cure du monde",
    trames: ["Porteur sain", "Marqué par l'indicible", "Chakrisme"],
  },
  {
    axe: "Axe II — Le Renforcement du bastion",
    trames: ["La Grande Veilleuse", "Pont entre deux mondes", "Rhizonaute"],
  },
  {
    axe: "Axe III — L'Extinction du marché rouge",
    trames: ["Death Mode", "Le Sang Nivéen", "Jeu du Calmar"],
  },
];

// --- Section « Caractère » : intitulés VERROUILLÉS côté admin.
//     Le joueur ne fait que répondre, il ne peut pas changer les questions.
//     `requiresTrame` : question affichée seulement si une trame est choisie.
//     (Pour modifier les intitulés : éditer ce tableau, côté code = côté staff.)
export interface CharacterQuestion {
  id: string;
  label: string;
  requiresTrame?: boolean;
}
export const CHARACTER_QUESTIONS: CharacterQuestion[] = [
  {
    id: "role_gen_sombres",
    label: "Quel rôle votre personnage a-t-il joué durant les Deux Générations Sombres ?",
  },
  {
    id: "konoha_yeux",
    label: "Que représente Konoha aux yeux de votre personnage ?",
  },
  {
    id: "legitime_trame",
    label: "Pourquoi votre personnage est-il légitime à prétendre à cette Trame ?",
    requiresTrame: true,
  },
  {
    id: "ambitions",
    label: "Quelles sont les ambitions de votre personnage ?",
  },
];

export interface ChronoEvent {
  year: string;
  label: string;
  text: string;
}

export interface PresentationData {
  clan: ClanKey;
  name: string;
  subtitle: string;
  avatarUrl: string;
  age: string;
  origine: string;
  trame: string; // "" = sans trame
  traits: string;
  // Réponses indexées par id de question (CHARACTER_QUESTIONS).
  answers: Record<string, string>;
  chrono: ChronoEvent[];
  hrp: {
    pseudo: string;
    found: string;
    parrain: string;
    partenaire: string;
  };
}

export function emptyAnswers(): Record<string, string> {
  return Object.fromEntries(CHARACTER_QUESTIONS.map((q) => [q.id, ""]));
}

export function emptyPresentation(): PresentationData {
  return {
    clan: "uchiha",
    name: "",
    subtitle: "",
    avatarUrl: "",
    age: "",
    origine: "",
    trame: "",
    traits: "",
    answers: emptyAnswers(),
    chrono: [{ year: "", label: "", text: "" }],
    hrp: { pseudo: "", found: "", parrain: "", partenaire: "" },
  };
}

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

export function presentationForumHtml(d: PresentationData): string {
  const clan = FOUNDING_CLANS[d.clan] ?? FOUNDING_CLANS.uchiha;
  const name = d.name.trim() || "Nom du personnage";

  // En-tête : kanji 火 en filigrane (fond) + crête du clan (teintée --clan).
  const head =
    `<div class="hnk-pres-head">` +
    `<div class="kanji">火</div>` +
    `<div class="hnk-pres-emblem"></div>` +
    `<div class="hnk-pres-eyebrow">Présentation</div>` +
    `<h1 class="hnk-pres-name">${escapeHtml(name)}</h1>` +
    (d.subtitle.trim()
      ? `<div class="hnk-pres-sub">${escapeHtml(d.subtitle)}</div>`
      : "") +
    `</div>`;

  // Personnage : avatar + identité
  const idRows = [
    ["Nom", name],
    ["Naissance", d.age],
    ["Origine", d.origine],
    ["Clan", clan.label],
    ["Trame", d.trame],
  ]
    .filter(([, v]) => (v ?? "").toString().trim() !== "")
    .map(([k, v]) => `<li><span>${k}</span><b>${escapeHtml(v as string)}</b></li>`)
    .join("");

  const avatar = d.avatarUrl.trim()
    ? `<div class="hnk-pres-ava"><img src="${escapeHtml(d.avatarUrl)}" alt="${escapeHtml(name)}"></div>`
    : "";

  const charSec =
    `<div class="hnk-pres-sec">` +
    `<h2 class="hnk-pres-title">Personnage</h2>` +
    `<div class="hnk-pres-char">${avatar}<ul class="hnk-pres-id">${idRows}</ul></div>` +
    `</div>`;

  // Traits particuliers
  const traitsSec = d.traits.trim()
    ? `<div class="hnk-pres-sec">` +
      `<h2 class="hnk-pres-title">Traits particuliers</h2>` +
      `<div class="hnk-pres-traits">${multiline(d.traits)}</div>` +
      `</div>`
    : "";

  // Caractère : questions verrouillées (Q "Trame" affichée seulement si trame).
  const qaItems = CHARACTER_QUESTIONS.map((q) => {
    if (q.requiresTrame && !d.trame.trim()) return "";
    const a = (d.answers[q.id] ?? "").trim();
    if (!a) return "";
    return (
      `<div class="hnk-pres-q">` +
      `<p class="q">${escapeHtml(q.label)}</p>` +
      `<p class="a">${multiline(d.answers[q.id])}</p>` +
      `</div>`
    );
  }).join("");
  const charQaSec = qaItems
    ? `<div class="hnk-pres-sec">` +
      `<h2 class="hnk-pres-title">Regards sur le Monde</h2>` +
      `<div class="hnk-pres-qa">${qaItems}</div>` +
      `</div>`
    : "";

  // Chronologie : fresque
  const events = d.chrono
    .filter((e) => e.year.trim() || e.label.trim() || e.text.trim())
    .map(
      (e) =>
        `<div class="ev">` +
        (e.year.trim() ? `<span class="yr">${escapeHtml(e.year)}</span>` : "") +
        (e.label.trim() ? `<span class="lab">${escapeHtml(e.label)}</span>` : "") +
        (e.text.trim() ? `<p>${multiline(e.text)}</p>` : "") +
        `</div>`
    )
    .join("");
  const chronoSec = events
    ? `<div class="hnk-pres-sec">` +
      `<h2 class="hnk-pres-title">Chronologie</h2>` +
      `<div class="hnk-pres-chrono">${events}</div>` +
      `</div>`
    : "";

  // HRP
  const hrpRows = [
    ["Pseudo joueur", d.hrp.pseudo],
    ["Trouvé le forum via", d.hrp.found],
    ["Parrain", d.hrp.parrain],
    ["Forum partenaire / autre", d.hrp.partenaire],
  ]
    .filter(([, v]) => (v ?? "").trim() !== "")
    .map(([k, v]) => `<li><span>${k}</span><b>${escapeHtml(v)}</b></li>`)
    .join("");
  const hrpSec = hrpRows
    ? `<div class="hnk-pres-sec">` +
      `<h2 class="hnk-pres-title">Hors-RP</h2>` +
      `<div class="hnk-pres-hrp"><div class="ico">外</div>` +
      `<div class="hrp-body"><ul>${hrpRows}</ul></div></div>` +
      `</div>`
    : "";

  return (
    `<div class="hnk-pres hnk-pres--${d.clan}" style="--clan:${clan.color}">` +
    head +
    charSec +
    traitsSec +
    charQaSec +
    chronoSec +
    hrpSec +
    `</div>`
  );
}

// ============================================================
//  IMPORT (inverse) — reconstruit les données depuis le code forum.
//  Sert à récupérer une fiche si la sauvegarde locale a sauté : on colle
//  le code, on récupère les champs. Parsing DOM → client uniquement
//  (DOMParser). Renvoie null si le code n'est pas reconnu.
// ============================================================

// Racine .hnk-pres du code collé (ou null si invalide / hors navigateur).
export function parseHnkRoot(html: string): Element | null {
  if (typeof DOMParser === "undefined") return null;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.querySelector(".hnk-pres");
  } catch {
    return null;
  }
}

export function nodeText(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

// Contenu multi-ligne : <br> → \n, le reste = texte (inverse de multiline()).
export function nodeMultiline(el: Element | null | undefined): string {
  if (!el) return "";
  let out = "";
  el.childNodes.forEach((n) => {
    if (n.nodeName === "BR") out += "\n";
    else out += n.textContent ?? "";
  });
  return out.replace(/[ \t]+\n/g, "\n").trim();
}

export function clanFromRoot(root: Element): ClanKey {
  for (const k of CLAN_KEYS) {
    if (root.classList.contains(`hnk-pres--${k}`)) return k;
  }
  return "uchiha";
}

// Liste d'identité <li><span>clé</span><b>valeur</b></li> → { clé(min): valeur }.
export function idPairs(nodes: NodeListOf<Element> | Element[]): Record<string, string> {
  const map: Record<string, string> = {};
  nodes.forEach((li) => {
    const k = nodeText(li.querySelector("span")).toLowerCase();
    if (k) map[k] = nodeText(li.querySelector("b"));
  });
  return map;
}

export function parsePresentationForumHtml(html: string): PresentationData | null {
  const root = parseHnkRoot(html);
  if (!root) return null;
  // Garde-fou : un bloc de CARNET (« Carnet de bord · … ») n'est pas une présentation.
  const eyebrow = nodeText(root.querySelector(".hnk-pres-eyebrow")).toLowerCase();
  if (eyebrow.includes("carnet")) return null;

  const base = emptyPresentation();
  const id = idPairs(root.querySelectorAll(".hnk-pres-char .hnk-pres-id li"));

  const answers = emptyAnswers();
  root.querySelectorAll(".hnk-pres-qa .hnk-pres-q").forEach((q) => {
    const label = nodeText(q.querySelector(".q"));
    const match = CHARACTER_QUESTIONS.find((cq) => cq.label === label);
    if (match) answers[match.id] = nodeMultiline(q.querySelector(".a"));
  });

  const chrono = Array.from(root.querySelectorAll(".hnk-pres-chrono .ev")).map((ev) => ({
    year: nodeText(ev.querySelector(".yr")),
    label: nodeText(ev.querySelector(".lab")),
    text: nodeMultiline(ev.querySelector("p")),
  }));

  const hrp = idPairs(root.querySelectorAll(".hnk-pres-hrp li"));

  return {
    clan: clanFromRoot(root),
    name: nodeText(root.querySelector(".hnk-pres-name")),
    subtitle: nodeText(root.querySelector(".hnk-pres-sub")),
    avatarUrl: root.querySelector(".hnk-pres-ava img")?.getAttribute("src") ?? "",
    age: id["naissance"] ?? "",
    origine: id["origine"] ?? "",
    trame: id["trame"] ?? "",
    traits: nodeMultiline(root.querySelector(".hnk-pres-traits")),
    answers,
    chrono: chrono.length ? chrono : base.chrono,
    hrp: {
      pseudo: hrp["pseudo joueur"] ?? "",
      found: hrp["trouvé le forum via"] ?? "",
      parrain: hrp["parrain"] ?? "",
      partenaire: hrp["forum partenaire / autre"] ?? "",
    },
  };
}
