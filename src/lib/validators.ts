// ============================================================
// Schémas zod — TOUTES les entrées serveur passent par ici.
// Aucune route ne lit `req.json()` sans `safeParse`.
// ============================================================

import { z } from "zod";

import { isManualReviewSubmission, requiresCollaborators } from "@/lib/progression";

// ----- Auth -----

export const registerSchema = z.object({
  // Pas d'email : le login se fait par username. L'API génère un email
  // synthétique interne pour satisfaire la contrainte unique non-null en base.
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[A-Za-z0-9_\- ]+$/, "Caractères autorisés : lettres, chiffres, _ -"),
  password: z.string().min(8).max(120),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  username: z.string().min(1).max(24),
  password: z.string().min(1).max(120),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ----- Fiches techniques (joueur) -----

const slug = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide (kebab-case)");

const rangEnum = z.enum(["E", "D", "C", "B", "A", "S"]).nullable().optional();

export const ficheCreateSchema = z.object({
  slug: slug.optional(), // auto-généré côté serveur depuis le nom si absent
  nom: z.string().min(2).max(120),
  description: z.string().min(10).max(20000),
  art: z.string().max(40).optional().nullable(),
  spec: z.string().max(40).optional().nullable(),
  // 2e Art Shinobi (type d'action COMBINEE).
  secondaryArt: z.string().max(40).optional().nullable(),
  secondarySpec: z.string().max(40).optional().nullable(),
  actionType: z
    .enum([
      "EVOLUTIVE",
      "UNIQUE",
      "DURABLE",
      "CHARGEE",
      "COMPLEXE",
      "COMBINEE",
      "COLLECTIVE",
      "ULTIME",
      "SUPREME",
    ])
    .optional()
    .nullable(),
  element: z.string().max(40).optional().nullable(),
  kekkeiGenkai: z.string().max(60).optional().nullable(),
  // COMBINEE : 2e manifestation (affinité et/ou KG).
  secondaryElement: z.string().max(40).optional().nullable(),
  secondaryKekkeiGenkai: z.string().max(60).optional().nullable(),
  nature: z.enum(["PERSONNELLE", "COLLECTIVE"]).optional().nullable(),
  // Nature COLLECTIVE → clan propriétaire (bibliothèque commune).
  clan: z.string().max(60).optional().nullable(),
  // Type d'action COLLECTIVE → pseudos exacts des partenaires (1 ou 2).
  collaborators: z.array(z.string().min(1).max(24)).max(2).optional(),
  // Technique de Kuchiyose → rattachée à une invocation du joueur.
  invocationId: z.string().cuid().optional().nullable(),
  // Commentaire temporaire du joueur (visible par le modérateur, effacé à la décision).
  comment: z.string().max(1000).optional().nullable(),
  // legacy (gardés optionnels pour compat)
  kinjutsuScope: z.enum(["CLAN", "VILLAGE"]).optional().nullable(),
  type: z.string().max(40).optional().nullable(),
  rangMin: rangEnum,
});
export type FicheCreateInput = z.infer<typeof ficheCreateSchema>;

export const ficheUpdateSchema = ficheCreateSchema.partial();
export type FicheUpdateInput = z.infer<typeof ficheUpdateSchema>;

// Intention seulement (le serveur recalcule le coût)
export const ficheSubmitSchema = z.object({
  id: z.string().cuid(),
});

// ----- Admin -----

export const adminXpSchema = z.object({
  userId: z.string().cuid(),
  amount: z.number().int().min(-100_000).max(100_000),
  note: z.string().max(280).optional(),
});

// Choix d'identité joueur (1er KG / 1ère affinité), irréversible côté serveur.
// secondAffinity : 2e affinité élémentaire, débloquée au rang global B (définitive).
export const identitySchema = z.object({
  kg: z.string().max(60).optional(),
  affinity: z.string().max(40).optional(),
  secondAffinity: z.string().max(40).optional(),
});

// Affinité du pacte Kuchiyose (1ère verrouillée ; 2e via pré-stade Mode Ermite).
// `species` : espèce du pacte, posée et verrouillée au 1er choix d'affinité.
export const pactAffinitySchema = z.object({
  affinity: z.string().min(1).max(40),
  species: z.string().max(60).optional(),
});

// Admin (god-mode) : remplace la liste complète des affinités du pacte d'un joueur.
export const adminPactAffinitySchema = z.object({
  affinities: z.array(z.string().max(40)).max(5),
});

export const adminProfilSchema = z.object({
  primaryKg: z.string().max(60).optional().nullable(),
  primaryAffinity: z.string().max(40).optional().nullable(),
  clan: z.string().max(60).optional().nullable(),
  rang: rangEnum,
  rangVillage: rangEnum,
  rangHistoire: rangEnum,
  rangClan: rangEnum,
  grade: z.enum(["GENIN", "CHUNIN", "JONIN"]).nullable().optional(),
  uniteSpeciale: z.string().max(60).optional().nullable(),
  trame: z.string().max(60).optional().nullable(),
  prime: z.string().max(2000).optional().nullable(),
  age: z.number().int().min(0).max(999).optional().nullable(),
  genre: z.string().max(40).optional().nullable(),
  kekkeiGenkai: z.string().max(60).optional().nullable(),
  affinites: z.array(z.string().max(40)).max(10).optional(),
});

export const adminPasswordResetSchema = z.object({
  password: z.string().min(8).max(120),
});

export const adminUsernameSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[A-Za-z0-9_\- ]+$/, "Caractères autorisés : lettres, chiffres, _ -"),
});

export const adminRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN", "TECH_MOD"]),
});

// ----- Arts Shinobi (dépense XP joueur) -----
// Le client n'envoie qu'une INTENTION ; le serveur recalcule le coût.
export const artActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("rankSpec"), art: z.string().max(30), spec: z.number().int().min(0).max(2) }),
  z.object({ type: z.literal("expertise"), art: z.string().max(30) }),
  z.object({ type: z.literal("choosePrimary"), art: z.string().max(30), spec: z.number().int().min(0).max(2) }),
  z.object({ type: z.literal("unlockKuchiyose") }),
  z.object({ type: z.literal("selectArt"), art: z.string().max(30) }),
  z.object({ type: z.literal("deselectArt"), art: z.string().max(30) }),
]);
export type ArtActionInput = z.infer<typeof artActionSchema>;

// ----- Invocations (Kuchiyose) -----
const invocationTechnique = z.object({
  nom: z.string().min(1).max(80),
  description: z.string().max(2000).default(""),
});
export const invocationSchema = z.object({
  nom: z.string().min(1).max(80),
  espece: z.string().max(60).optional().nullable(),
  // Art Shinobi de l'animal (remplace le KG côté invocation).
  artShinobi: z.string().max(40).optional().nullable(),
  // KG : seulement si Mode Ermite stade 2 (KG partagé) — sinon ignoré côté serveur.
  kekkeiGenkai: z.string().max(60).optional().nullable(),
  image: z.union([z.string().url().max(500), z.literal("")]).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  techniques: z.array(invocationTechnique).max(30).optional(),
});
export type InvocationInput = z.infer<typeof invocationSchema>;

// ----- Quintessences & Modes spéciaux -----
export const progressionActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("buyQuintessence"),
    kind: z.enum(["ART", "KG", "KG2"]),
    target: z.string().min(1).max(60),
  }),
  z.object({
    type: z.literal("engageMode"),
    path: z.enum(["ERMITE", "JINCHURIKI", "OTSUTSUKI"]),
  }),
]);
export type ProgressionActionInput = z.infer<typeof progressionActionSchema>;

// ----- Progression (Village / Clan / Histoire) -----
// Le joueur soumet UN RP pour une condition. Le serveur résout
// track / tier / palier / scope depuis COND_CATALOG, et gate le palier.
export const progressionSubmitSchema = z.object({
  condId: z.string().min(3).max(80),
  rpTitle: z.string().max(160).optional().nullable(),
  // Lien tolérant : le serveur normalise (préfixe https:// si le schéma manque).
  rpUrl: z.string().max(500).optional().nullable(),
  comment: z.string().trim().max(2000).optional().nullable(),
  collaborators: z.array(z.string().trim().min(1).max(24)).max(8).optional(),
}).superRefine((data, ctx) => {
  const grouped = requiresCollaborators(data.condId);
  const manual = isManualReviewSubmission(data.condId);
  const collaborators = (data.collaborators ?? []).map((s) => s.trim()).filter(Boolean);

  if (grouped && collaborators.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["collaborators"],
      message: "Au moins un pseudo exact est requis.",
    });
  }

  if (!grouped && collaborators.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["collaborators"],
      message: "Cette condition se soumet en solo.",
    });
  }

  if (manual && collaborators.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["collaborators"],
      message: "La demande manuelle ne nécessite pas de co-participant.",
    });
  }
});
export type ProgressionSubmitInput = z.infer<typeof progressionSubmitSchema>;

// Un seul RP coché sur plusieurs conditions à la fois.
export const progressionBatchSchema = z.object({
  condIds: z.array(z.string().min(3).max(80)).min(1).max(60),
  rpTitle: z.string().max(160).optional().nullable(),
  rpUrl: z.string().max(500).optional().nullable(),
  comment: z.string().trim().max(2000).optional().nullable(),
  collaborators: z.array(z.string().trim().min(1).max(24)).max(8).optional(),
}).superRefine((data, ctx) => {
  const modes = new Set(
    data.condIds.map((condId) =>
      isManualReviewSubmission(condId) ? "MANUAL" : requiresCollaborators(condId) ? "GROUP" : "SOLO"
    )
  );
  const collaborators = (data.collaborators ?? []).map((s) => s.trim()).filter(Boolean);

  if (modes.has("MANUAL") && data.condIds.length > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["condIds"],
      message: "Une demande manuelle doit être soumise seule.",
    });
  }

  if (modes.has("GROUP") && collaborators.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["collaborators"],
      message: "Au moins un pseudo exact est requis.",
    });
  }

  if (!modes.has("GROUP") && collaborators.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["collaborators"],
      message: "Cette sélection se soumet en solo.",
    });
  }
});
export type ProgressionBatchInput = z.infer<typeof progressionBatchSchema>;

// Joueur : « Dépenser X XP pour monter en Rang » sur une voie.
export const progressionLevelupSchema = z.object({
  track: z.enum(["VILLAGE", "CLAN", "HISTOIRE"]),
});

// Staff : décision sur une soumission de progression.
export const progressionDecisionSchema = z.object({
  decision: z.enum(["VALIDATE", "REJECT"]),
  reason: z.string().max(500).optional(),
});

// Staff : pose le rang communautaire « de base » (village ou un clan).
export const communityRankSchema = z.object({
  scopeType: z.enum(["VILLAGE", "CLAN"]),
  scopeKey: z.string().min(1).max(80),
  baseRank: z.enum(["E", "D", "C", "B", "A", "S"]),
});

// Staff : valide/dévalide directement une condition communautaire « gérée par
// le staff » (ex : « Atteindre N réponses RP postées »), sans soumission membre.
export const progressionConditionSchema = z.object({
  scopeType: z.enum(["VILLAGE", "CLAN"]),
  scopeKey: z.string().min(1).max(80),
  condId: z.string().min(3).max(80),
  validated: z.boolean(),
});

// Admin : reset des progressions. Efface les soumissions (conditions validées /
// en attente) — action distincte de la baisse de rang (gérée via le profil).
//   - USER      : conditions INDIVIDUELLES d'un joueur sur une voie.
//   - COMMUNITY : conditions COMMUNAUTAIRES d'un scope (village ou un clan).
export const progressionResetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("USER"),
    userId: z.string().min(1),
    track: z.enum(["VILLAGE", "CLAN", "HISTOIRE"]),
  }),
  z.object({
    kind: z.literal("COMMUNITY"),
    scopeType: z.enum(["VILLAGE", "CLAN"]),
    scopeKey: z.string().min(1).max(80),
  }),
]);

// ----- Admin : tweak arts & quintessences (mode god, sans XP) -----
const rangOpt = z.enum(["E", "D", "C", "B", "A", "S"]).nullable();
export const adminArtsSchema = z.object({
  artsState: z.record(
    z.string(),
    z.object({
      expertised: z.boolean().optional(),
      unlocked: z.boolean().optional(),
      owned: z.boolean().optional(),
      primarySpec: z.number().int().min(0).max(2).optional(),
      specs: z.array(rangOpt).max(3).optional(),
    })
  ),
});
export const adminQuintSchema = z.object({
  quintessences: z
    .array(z.object({ kind: z.enum(["ART", "KG", "KG2", "KUCHIYOSE"]), target: z.string().min(1).max(60) }))
    .max(50),
});

export const adminForumLinkSchema = z.object({
  forumProfileUrl: z
    .string()
    .url()
    .refine((u) => /\/u\d+/.test(u), "URL doit pointer vers /u<ID>"),
});

export const adminFicheValidateSchema = z.object({
  ficheId: z.string().cuid(),
  decision: z.enum(["VALIDATE", "REJECT"]),
  reason: z.string().optional(),
  // Le coût final est recalculé serveur ; l'admin peut surcharger ici
  costOverride: z.number().int().min(0).max(100_000).optional(),
});

// Admin : ajout manuel d'une technique dans la fiche d'un joueur (ou bibliothèque
// de clan). Créée directement en VALIDATED, sans débit XP (coutXp au choix).
export const adminFicheCreateSchema = z.object({
  nom: z.string().min(2).max(120),
  description: z.string().min(1).max(20000),
  art: z.string().max(40).optional().nullable(),
  spec: z.string().max(40).optional().nullable(),
  secondaryArt: z.string().max(40).optional().nullable(),
  secondarySpec: z.string().max(40).optional().nullable(),
  actionType: z
    .enum([
      "EVOLUTIVE",
      "UNIQUE",
      "DURABLE",
      "CHARGEE",
      "COMPLEXE",
      "COMBINEE",
      "COLLECTIVE",
      "ULTIME",
      "SUPREME",
    ])
    .optional()
    .nullable(),
  element: z.string().max(40).optional().nullable(),
  kekkeiGenkai: z.string().max(60).optional().nullable(),
  nature: z.enum(["PERSONNELLE", "COLLECTIVE"]).optional().nullable(),
  clan: z.string().max(60).optional().nullable(),
  invocationId: z.string().cuid().optional().nullable(),
  coutXp: z.number().int().min(0).max(100_000).optional(),
});
export type AdminFicheCreateInput = z.infer<typeof adminFicheCreateSchema>;

export const adminKekkeiCatalogSchema = z.object({
  name: z.string().min(2).max(80),
  subtitle: z.string().max(120).optional().nullable(),
  clan: z.string().max(60).optional().nullable(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "Couleur hexadécimale attendue (#RRGGBB)"),
  category: z.enum(["CLANIQUE", "ELEMENTAIRE", "DOJUTSU", "SPECIAL"]),
  quintessence: z.string().max(180).optional().nullable(),
  kinjutsu: z.string().max(180).optional().nullable(),
  finale: z.string().max(180).optional().nullable(),
});
export type AdminKekkeiCatalogInput = z.infer<typeof adminKekkeiCatalogSchema>;

// Admin : ajout d'une technique dans la bibliothèque commune d'un clan
// (créée VALIDATED, nature COLLECTIVE, auteur = admin). KG associé requis.
export const adminClanLibrarySchema = z.object({
  clan: z.string().min(1).max(60),
  nom: z.string().min(2).max(120),
  description: z.string().min(1).max(20000),
  art: z.string().max(40).optional().nullable(),
  actionType: z
    .enum([
      "EVOLUTIVE",
      "UNIQUE",
      "DURABLE",
      "CHARGEE",
      "COMPLEXE",
      "COMBINEE",
      "COLLECTIVE",
      "ULTIME",
      "SUPREME",
    ])
    .optional()
    .nullable(),
  element: z.string().max(40).optional().nullable(),
  kekkeiGenkai: z.string().min(1).max(60),
  secondaryElement: z.string().max(40).optional().nullable(),
  secondaryKekkeiGenkai: z.string().max(60).optional().nullable(),
  coutXp: z.number().int().min(0).max(100_000).optional(),
});
export type AdminClanLibraryInput = z.infer<typeof adminClanLibrarySchema>;
