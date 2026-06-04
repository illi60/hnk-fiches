// ============================================================
// Test end-to-end du parser Forumactif (aucune DB requise).
// Fetch le profil RÉEL /u<ID> et affiche le ForumProfile parsé.
//
//   npx tsx scripts/test-parse.ts          (défaut /u1)
//   npx tsx scripts/test-parse.ts 2        (autre user)
//
// `source` doit valoir "block" si le bloc #hnk-profile-data est
// bien déployé sur le forum, sinon "html" (fallback visuel).
// ============================================================

import { fetchForumProfile, forumProfileUrl } from "../src/lib/forum-parser";

async function main() {
  const id = Number(process.argv[2] ?? 1);
  if (!Number.isInteger(id) || id <= 0) {
    console.error("ID invalide. Usage: npx tsx scripts/test-parse.ts <forumUserId>");
    process.exit(1);
  }

  console.log("Fetch:", forumProfileUrl(id));
  const res = await fetchForumProfile(id);

  if (!res.ok || !res.profile) {
    console.error("\n❌ ÉCHEC parsing:", res.error);
    process.exit(1);
  }

  const p = res.profile;
  const line = (k: string, v: unknown) => console.log("  " + k.padEnd(14) + ": " + String(v));

  console.log("\n=== ForumProfile /u" + id + " ===");
  line("source", p.source + (p.source === "block" ? "  ✅ (bloc primaire)" : "  ⚠️  (fallback HTML)"));
  line("pseudo", p.forumPseudo);
  line("avatar", p.avatarUrl ? "(présent)" : null);
  line("groupColor", p.groupColor);
  line("clan", p.clan);
  line("rang", p.rang + " (raw: " + p.rangRaw + ")");
  line("xp", p.xp);
  line("grade", p.grade);
  line("age", p.age);
  line("messages", p.postsCount);
  line("présentation", p.presentationUrl ? "(présent)" : null);
  line("carnet", p.carnetUrl ? "(présent)" : null);
  line("inscrit", p.registeredAt);
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
