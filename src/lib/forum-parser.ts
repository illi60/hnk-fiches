// ============================================================
// Parser HTML de la page profil Forumactif Hi no Kuni.
//
// URL : ${FORUM_BASE_URL}/u<ID>  (ex: /u1)
// Page PUBLIQUE (pas de login requis). HTML stable :
//
//   <aside class="hnk-profile-card">
//     <div class="av"><img src="..."></div>
//     <div class="nm"><span class="usr_grp_clr" style="color:#XXXXXX">Pseudo</span></div>
//   </aside>
//
//   <div class="hnk-profile-info">
//     <section class="panel">  ← 1ère = Carte d'identité
//       <h4>Carte d'identité</h4>
//       <div class="grid2">
//         <div class="item"><span class="k">Pseudo</span><span class="v">...</span></div>
//         ...
//       </div>
//     </section>
//     <section class="panel">  ← 2ème = Fiche du personnage
//       <h4>Fiche du personnage</h4>
//       <div class="grid2">
//         <div class="item">
//           <span class="k">Clan</span>
//           <span class="v"><div class="field_uneditable">Sarutobi</div></span>
//         </div>
//         ...
//       </div>
//     </section>
//   </div>
//
// On itère sur `.hnk-profile-info section.panel .grid2 .item`
// et on mappe la clé textuelle ("Clan", "Rang", "Expérience"…)
// vers nos champs internes.
// ============================================================

import * as cheerio from "cheerio";
import type { Rang } from "@prisma/client";

export interface ForumProfile {
  // identité
  forumUserId: number;
  forumPseudo: string | null;
  avatarUrl: string | null;
  groupColor: string | null; // hex

  // RP (peut être null si la fiche n'a pas été remplie côté forum)
  clan: string | null;
  rang: Rang | null; // E/D/C/B/A/S
  rangRaw: string | null; // tel quel
  xp: number | null;
  grade: string | null;
  uniteSpeciale: string | null;
  trame: string | null;
  prime: string | null;
  age: number | null;
  genre: string | null;
  kekkeiGenkai: string | null;
  affinites: string[];

  // liens RP croisés
  presentationUrl: string | null;
  carnetUrl: string | null;

  // meta
  registeredAt: string | null;
  postsCount: number | null;
  source: "block" | "html"; // d'où viennent les champs : bloc primaire #hnk-profile-data, ou fallback HTML visuel
}

export interface ForumParseResult {
  ok: boolean;
  profile?: ForumProfile;
  error?: string;
}

const RANG_SET = new Set<Rang>(["E", "D", "C", "B", "A", "S"]);

function clean(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function toInt(s: string | null): number | null {
  if (!s) return null;
  const m = clean(s).match(/-?\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function isPlaceholder(v: string): boolean {
  const t = v.trim();
  return t === "" || t === "-" || t === "—" || t.toLowerCase() === "aucun";
}

function normalizeKey(k: string): string {
  return clean(k)
    .replace(/\s*:\s*$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function extractForumUserId(url: string): number | null {
  const m = url.match(/\/u(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

interface IdentityInfo {
  pseudo: string | null;
  avatarUrl: string | null;
  groupColor: string | null;
}

// ------------------------------------------------------------
// SOURCE PRIMAIRE : bloc machine-readable #hnk-profile-data.
//
// Injecté dans profile_view_body (caché) :
//   <div id="hnk-profile-data">
//     <span class="hnk-pf"><span class="pk">username</span><span class="pv">{USERNAME}</span></span>
//     <span class="hnk-pf"><span class="pk">avatar</span><span class="pv">{AVATAR_IMG}</span></span>
//     <span class="hnk-pf"><span class="pk">{profile_field.LABEL}</span><span class="pv">{profile_field.CONTENT}</span></span>
//     ...
//   </div>
//
// On lit le textContent (cheerio .text() strippe le HTML que FA
// injecte dans les valeurs : <span style=...>, <div class="field_uneditable">).
// Retourne null si le bloc est absent → on bascule sur le fallback HTML.
// ------------------------------------------------------------
function readDataBlock(
  $: cheerio.CheerioAPI
): { fields: Record<string, string>; identity: IdentityInfo } | null {
  const block = $("#hnk-profile-data");
  if (!block.length) return null;

  const fields: Record<string, string> = {};
  const identity: IdentityInfo = { pseudo: null, avatarUrl: null, groupColor: null };

  block.find(".hnk-pf").each((_, el) => {
    const key = normalizeKey($(el).find(".pk").first().text());
    if (!key) return;
    const pv = $(el).find(".pv").first();

    if (key === "avatar") {
      identity.avatarUrl = pv.find("img").attr("src") || null;
      return;
    }
    if (key === "username") {
      identity.pseudo = clean(pv.text()) || null;
      const styleAttr =
        pv.find("[style*='color']").attr("style") || pv.find("span").attr("style") || "";
      const m = styleAttr.match(/color\s*:\s*(#[0-9a-fA-F]{3,8})/);
      if (m) identity.groupColor = m[1];
      return;
    }

    // Champ standard : .field_uneditable de préférence (champs select FA), sinon textContent.
    let val = clean(pv.find(".field_uneditable").first().text());
    if (!val) val = clean(pv.text());
    fields[key] = val;
  });

  // Bloc présent mais inexploitable → on laisse le fallback prendre le relais.
  if (Object.keys(fields).length === 0 && !identity.pseudo) return null;
  return { fields, identity };
}

// ------------------------------------------------------------
// FALLBACK : parse du HTML visuel (.hnk-profile-info → "Fiche du personnage").
// Conservé tel quel : sert si le bloc primaire est absent (template pas
// encore redéployé, ou futur changement côté forum).
// ------------------------------------------------------------
function readVisualFields($: cheerio.CheerioAPI): Record<string, string> {
  const fields: Record<string, string> = {};
  const fichePanel = $(".hnk-profile-info section.panel")
    .filter((_, el) => /Fiche du personnage/i.test($(el).find("h4").text()))
    .first();
  fichePanel.find(".grid2 .item").each((_, el) => {
    const key = normalizeKey($(el).find(".k").text());
    let val = clean($(el).find(".v .field_uneditable").first().text());
    if (!val) val = clean($(el).find(".v").text());
    if (key) fields[key] = val;
  });
  return fields;
}

function readVisualIdentity($: cheerio.CheerioAPI): IdentityInfo {
  const nameSpan = $("aside.hnk-profile-card .nm .usr_grp_clr").first();
  const pseudo =
    clean(nameSpan.text()) ||
    clean($("title").text().replace(/^Voir un profil\s*-\s*/i, "")) ||
    null;
  const styleAttr = nameSpan.attr("style") || "";
  const colorMatch = styleAttr.match(/color\s*:\s*(#[0-9a-fA-F]{3,8})/);
  const groupColor = colorMatch ? colorMatch[1] : null;
  const avatarUrl = $("aside.hnk-profile-card .av img").attr("src") || null;
  return { pseudo, avatarUrl, groupColor };
}

export function parseForumProfileHtml(html: string, sourceUrl: string): ForumParseResult {
  try {
    const $ = cheerio.load(html);

    const forumUserId = extractForumUserId(sourceUrl);
    if (forumUserId === null) {
      return { ok: false, error: "URL_INVALID" };
    }

    // --- Source PRIMAIRE (#hnk-profile-data) avec fallback HTML visuel ---
    const block = readDataBlock($);
    const vis = readVisualIdentity($);

    const fields: Record<string, string> = block ? block.fields : readVisualFields($);
    const parseSource: "block" | "html" = block ? "block" : "html";

    // Identité : préfère le bloc, retombe sur la carte visuelle champ par champ.
    const forumPseudo = block?.identity.pseudo ?? vis.pseudo;
    const groupColor = block?.identity.groupColor ?? vis.groupColor;
    const avatarUrl = block?.identity.avatarUrl ?? vis.avatarUrl;

    const get = (k: string): string | null => {
      const v = fields[k];
      if (v == null) return null;
      return isPlaceholder(v) ? null : v;
    };

    const clan = get("clan");
    const rangRaw = get("rang");
    const rang: Rang | null =
      rangRaw && RANG_SET.has(rangRaw.toUpperCase() as Rang)
        ? (rangRaw.toUpperCase() as Rang)
        : null;

    const xp = toInt(get("experience"));
    const grade = get("grade");
    const uniteSpeciale = get("unite speciale") ?? get("unitÃ© spÃ©ciale");
    const trame = get("trame");
    const prime = get("prime");
    const age = toInt(get("age"));
    const genre = get("genre");
    const kekkeiGenkai = get("kekkei genkai");
    const affinitesRaw = get("affinites") ?? get("affinitÃ©s");
    const affinites = affinitesRaw
      ? affinitesRaw
          .split(/[,;/·]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const presentationUrl = get("lien vers la presentation");
    const carnetUrl = get("lien vers le carnet de bord");
    // "joined"/"posts" = valeurs natives FA toujours présentes dans le bloc primaire
    // ({JOINED}/{POSTS}) → repli fiable si les champs RP custom ne sont pas remplis.
    const registeredAt = get("date d inscription") ?? get("inscrit le") ?? get("joined");
    const postsCount = toInt(get("messages") ?? get("posts"));

    return {
      ok: true,
      profile: {
        forumUserId,
        forumPseudo,
        avatarUrl,
        groupColor,
        clan,
        rang,
        rangRaw,
        xp,
        grade,
        uniteSpeciale,
        trame,
        prime,
        age,
        genre,
        kekkeiGenkai,
        affinites,
        presentationUrl,
        carnetUrl,
        registeredAt,
        postsCount,
        source: parseSource,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "PARSE_ERROR" };
  }
}

// ============================================================
// Fetch HTTP (politesse : User-Agent identifiable, timeout).
// IMPORTANT : Forumactif a déjà déclenché son anti-scraper sur
// ce forum (cf. CdC §20.9). Toujours espacer les requêtes (1
// par user max par run) et NE PAS multipler les retries.
// ============================================================

const FORUM_BASE = (process.env.FORUM_BASE_URL ?? "https://hinokuni.forumactif.com").replace(
  /\/$/,
  ""
);

export function forumProfileUrl(forumUserId: number): string {
  return `${FORUM_BASE}/u${forumUserId}`;
}

export async function fetchForumProfile(
  forumUserId: number,
  signal?: AbortSignal
): Promise<ForumParseResult> {
  const url = forumProfileUrl(forumUserId);
  try {
    const res = await fetch(url, {
      signal,
      cache: "no-store",
      redirect: "follow",
      headers: {
        "User-Agent": "HNK-FT-Sync/1.0 (+companion site for Hi no Kuni; respectful crawler)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr",
      },
    });
    if (!res.ok) return { ok: false, error: `HTTP_${res.status}` };
    const html = await res.text();
    return parseForumProfileHtml(html, url);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "FETCH_ERROR" };
  }
}
