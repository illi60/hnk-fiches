// ============================================================
// Voies de Progression — Village · Clan · Histoire (source de vérité affichage + validation).
//
// Système de progression du forum Hi no Kuni : chaque personnage progresse
// SIMULTANÉMENT dans 3 voies (Village, Clan, Histoire). Le rang général = le
// PLUS HAUT des trois (cf. lib n'a pas à le calculer ici — c'est l'app/admin).
//
// Double degré de conditions (voies communautaires Village/Clan) :
//   1. Conditions COMMUNAUTAIRES — partagées (échelle village / clan). Doivent
//      être remplies AVANT les conditions individuelles du même palier.
//   2. Conditions INDIVIDUELLES — propres au joueur. « Dépenser X XP pour monter »
//      OU compléter la liste d'alternatives.
// La voie HISTOIRE est purement individuelle (aucune condition communautaire).
//
// Visibilité (pilotée par la page) :
//   - Village  → conditions communautaires accessibles à TOUS les membres.
//   - Clan     → conditions communautaires accessibles aux membres du clan.
//   - Histoire → entièrement personnelle.
//
// ⚠️ Les `id` de conditions sont STABLES (utilisés en base pour les soumissions).
//    Ne jamais renuméroter un id existant : ça orphelinerait les soumissions.
// ============================================================

import { RANKS, rankIndex, type Rank } from "@/lib/arts";

export { RANKS, rankIndex, type Rank };

export const PROGRESSION_TRACKS = ["VILLAGE", "CLAN", "HISTOIRE"] as const;
export type ProgTrack = (typeof PROGRESSION_TRACKS)[number];

export type ProgScope = "VILLAGE" | "CLAN" | "PERSO";

// Une condition unitaire (cochable / soumise une fois).
export interface ProgCond {
  id: string;
  label: string;
  /** Cible chiffrée mentionnée dans la règle (affichage / contexte). */
  count?: number;
}

// Bloc « Pour accéder en plus … » (Histoire) : un choix parmi plusieurs (OU).
export interface ProgExtra {
  id: string;
  label: string;
  /** true = bloc obligatoire (ex : Mode Spécial final au Rang S Histoire). */
  required?: boolean;
  /** Choix mutuellement alternatifs : un seul à valider. */
  choices: ProgCond[];
}

// Volet individuel d'un palier.
export interface ProgIndividual {
  /** Raccourci « Dépenser X XP pour monter en Rang » (0 = pas de raccourci). */
  xp: number;
  /** Alternatives au raccourci XP (toutes requises si on ne paie pas l'XP). */
  alternatives: ProgCond[];
  /** Blocs optionnels / obligatoires supplémentaires (Histoire). */
  extras?: ProgExtra[];
}

export interface ProgPalier {
  rank: Rank; // D..S — E est la situation initiale (pas de conditions)
  flavorCommunity?: string;
  flavorIndividual?: string;
  /** Conditions communautaires (Village / Clan uniquement). */
  community?: ProgCond[];
  /** Conditions individuelles (absent au Rang E). */
  individual?: ProgIndividual;
  rewards: string[];
}

export interface ProgTrackDef {
  key: ProgTrack;
  label: string;
  kanji: string;
  scope: ProgScope;
  intro: string;
  paliers: ProgPalier[]; // E..S
}

// ------------------------------------------------------------
// Préceptes communs aux 3 voies (affichés en tête de page).
// ------------------------------------------------------------
export const PROGRESSION_PRINCIPLES = [
  {
    title: "Triple évolution",
    body: "Chaque shinobi progresse simultanément dans trois voies distinctes : son Village, son Clan et son Histoire.",
  },
  {
    title: "Non cumul des Rangs",
    body: "C'est toujours le plus haut rang obtenu parmi les trois qui détermine le rang général. Atteindre un rang dans une voie ne débloque pas les récompenses des autres.",
  },
  {
    title: "Double degré de conditions",
    body: "Pour les voies communautaires (Village/Clan), il faut d'abord remplir les conditions communautaires. Un même RP ne peut pas valider deux conditions communautaires, mais peut ensuite servir à tes conditions individuelles.",
  },
  {
    title: "Précisions",
    body: "« RP Libre » = tout type de RP (Défi, Mission, Trivia). Si un type est précisé, seul celui-ci compte. Toute mention du KG s'entend largement (le KG de tous les membres du Clan, même différent).",
  },
];

// ============================================================
// VOIE DU VILLAGE
// ============================================================
const VILLAGE: ProgTrackDef = {
  key: "VILLAGE",
  label: "Village",
  kanji: "里",
  scope: "VILLAGE",
  intro:
    "La voie du bien commun : mesurer la capacité de Konoha à vivre en harmonie, préserver sa stabilité et offrir un cadre de vie durable à toute la communauté shinobi.",
  paliers: [
    {
      rank: "E",
      flavorCommunity:
        "Konoha demeure un village encore instable, dont les structures essentielles restent à consolider.",
      flavorIndividual:
        "Le personnage est en marge du fonctionnement de Konoha ou ne cherche pas à y trouver sa place.",
      rewards: [
        "Débloque l'accès aux missions libres. Ton personnage peut choisir d'orienter leurs conséquences pour servir Konoha.",
      ],
    },
    {
      rank: "D",
      flavorCommunity:
        "Konoha devient pleinement fonctionnel et ouvre ses premières infrastructures communes.",
      flavorIndividual:
        "Le personnage commence à se situer dans la communauté et à y trouver un rôle, même modeste ou sporadique.",
      community: [
        { id: "VILLAGE.D.c1", label: "Atteindre 300 XP cumulés à l'échelle du village.", count: 300 },
        { id: "VILLAGE.D.c2", label: "Atteindre 100 réponses RP postées au total sur le forum.", count: 100 },
        { id: "VILLAGE.D.c3", label: "Réaliser 20 missions de Rang D avantageant le Village.", count: 20 },
        { id: "VILLAGE.D.c4", label: "Réaliser 20 RP Libres dans l'enceinte de Konoha.", count: 20 },
        { id: "VILLAGE.D.c5", label: "Réaliser 12 RP impliquant des membres de clans différents.", count: 12 },
        { id: "VILLAGE.D.c6", label: "Réaliser 10 RP Trivia internes à Hi, dont au moins 5 relatifs à Konoha.", count: 10 },
        { id: "VILLAGE.D.c7", label: "Réaliser 5 RP Défis avec un membre du village.", count: 5 },
        { id: "VILLAGE.D.c8", label: "Avoir 5 personnages de Rang D minimum.", count: 5 },
      ],
      individual: {
        xp: 10,
        alternatives: [
          { id: "VILLAGE.D.i1", label: "Participer à 2 RP au choix à Konoha.", count: 2 },
          { id: "VILLAGE.D.i2", label: "Participer à 1 mission de Rang D avantageant le village.", count: 1 },
        ],
      },
      rewards: [
        "Débloque l'accès à la Boutique du forum, te permettant de dépenser ton XP dans un ensemble de services annexes.",
        "Débloque les 4 Corps Spéciaux de Konoha : Ningen (érudition), Joheki (protection), Ijo (anomalie), Shikei (espionnage). Donne accès au système de grade (Genin, Chuunin, Jonin).",
        "Débloque l'apparition de PNJ itinérants venus de régions lointaines (missions uniques, artefacts rares, informations, projets spécifiques).",
        "Débloque l'accès aux zones des nations étrangères et au système de Conquête.",
      ],
    },
    {
      rank: "C",
      flavorCommunity:
        "Konoha renforce ses mécanismes d'entraînement, de progression et d'organisation interne.",
      flavorIndividual:
        "Le personnage s'intègre pleinement à la dynamique de Konoha et devient l'un de ses rouages essentiels.",
      community: [
        { id: "VILLAGE.C.c1", label: "Atteindre 600 XP cumulés à l'échelle du village.", count: 600 },
        { id: "VILLAGE.C.c2", label: "Atteindre 250 réponses RP postées au total sur le forum.", count: 250 },
        { id: "VILLAGE.C.c3", label: "Réaliser 20 missions de Rang C avantageant le Village.", count: 20 },
        { id: "VILLAGE.C.c4", label: "Acheter 20 marchandises dans la Boutique.", count: 20 },
        { id: "VILLAGE.C.c5", label: "Purifier 10 RP Anomalies non narrées à Hi no Kuni.", count: 10 },
        { id: "VILLAGE.C.c6", label: "Réaliser 10 RP Défis avec des membres d'un Corps Spécial différent.", count: 10 },
        { id: "VILLAGE.C.c7", label: "Réaliser 10 RP Libres où deux unités sont en rivalité.", count: 10 },
        { id: "VILLAGE.C.c8", label: "Réaliser 10 RP Libres où deux unités s'entraident.", count: 10 },
        { id: "VILLAGE.C.c9", label: "Avoir 5 personnages de Rang C.", count: 5 },
        { id: "VILLAGE.C.c10", label: "Avoir 1 membre minimum par unité.", count: 1 },
        { id: "VILLAGE.C.c11", label: "Aider 1 PNJ Itinérant.", count: 1 },
      ],
      individual: {
        xp: 20,
        alternatives: [
          { id: "VILLAGE.C.i1", label: "Participer à 2 missions de Rang C avantageant le Village.", count: 2 },
          { id: "VILLAGE.C.i2", label: "Participer à 2 RP impliquant des unités différentes.", count: 2 },
        ],
      },
      rewards: [
        "Les RP Défis génèrent désormais +5 XP supplémentaires.",
        "Débloque le cadeau mystère, une récompense mensuelle tirée aléatoirement (XP brute, multiplicateur temporaire, information rare, amorce d'intrigue, avantage ponctuel…).",
        "Débloque l'accès au Gantelet Shinobi : utiliser des mini-rouleaux contenant des actions d'autres Kekkei Genkai (1 utilisation par RP, recharge à la fin).",
      ],
    },
    {
      rank: "B",
      flavorCommunity:
        "Konoha atteint son plein potentiel et devient le modèle auquel toute organisation shinobi pourrait se mesurer.",
      flavorIndividual:
        "Le personnage devient une figure notable de Konoha et est clairement perçu comme un membre influent.",
      community: [
        { id: "VILLAGE.B.c1", label: "Atteindre 1200 XP cumulés à l'échelle du village.", count: 1200 },
        { id: "VILLAGE.B.c2", label: "Atteindre 500 réponses RP postées au total sur le forum.", count: 500 },
        { id: "VILLAGE.B.c3", label: "Réaliser 30 missions de Rang B dont au moins 10 à l'étranger avantageant le Village.", count: 30 },
        { id: "VILLAGE.B.c4", label: "Purifier 5 RP Anomalies non narrées par pays étrangers.", count: 5 },
        { id: "VILLAGE.B.c5", label: "Réaliser au moins 5 RP Trivia par pays étrangers.", count: 5 },
        { id: "VILLAGE.B.c6", label: "Avoir 5 personnages de Rang B.", count: 5 },
        { id: "VILLAGE.B.c7", label: "Avoir 3 personnages disposant d'un Titre.", count: 3 },
      ],
      individual: {
        xp: 50,
        alternatives: [
          { id: "VILLAGE.B.i1", label: "Participer à 3 missions de Rang B avantageant le Village.", count: 3 },
          { id: "VILLAGE.B.i2", label: "Participer à 3 RP au choix dans un pays étranger.", count: 3 },
          { id: "VILLAGE.B.i3", label: "Acheter 3 marchandises dans la boutique.", count: 3 },
        ],
      },
      rewards: [
        "Débloque la création du Kinjutsu de Konoha, une action définie collectivement, accessible à tous indépendamment des Kekkei Genkai (technique signature du village).",
        "Débloque l'accès au Bingo Book (PNJ recherchés anormalement puissants) et aux RP Traques — la prime d'XP est partagée entre les participants.",
        "Permet de participer au système d'Influence : campagne pour Chef de Clan, Chef d'Unité, Sannin ou Hokage.",
        "Débloque le système d'Atout : la communauté crée ses propres récompenses, chacune via des conditions définies.",
        "Débloque l'accès à la Contrée Interdite.",
      ],
    },
    {
      rank: "A",
      flavorCommunity:
        "Konoha dépasse sa condition de village exemplaire et gravit les premiers sommets du monde shinobi.",
      flavorIndividual:
        "Le personnage s'affirme comme un repère central de Konoha, dont la position influence son équilibre général.",
      community: [
        { id: "VILLAGE.A.c1", label: "Atteindre 2500 XP cumulés à l'échelle du village.", count: 2500 },
        { id: "VILLAGE.A.c2", label: "Atteindre 1000 réponses RP postées au total sur le forum.", count: 1000 },
        { id: "VILLAGE.A.c3", label: "Réaliser 5 Missions D, C et B avantageant le Village par pays étrangers.", count: 5 },
        { id: "VILLAGE.A.c4", label: "Acheter 60 marchandises dans la boutique.", count: 60 },
        { id: "VILLAGE.A.c5", label: "Utiliser dans 30 RP différents le Kinjutsu de Konoha.", count: 30 },
        { id: "VILLAGE.A.c6", label: "Avoir au moins 2 Chefs de Clan.", count: 2 },
        { id: "VILLAGE.A.c7", label: "Avoir au moins 2 Chefs d'Unité.", count: 2 },
        { id: "VILLAGE.A.c8", label: "Avoir proposé et validé au moins 1 Atout.", count: 1 },
        { id: "VILLAGE.A.c9", label: "Avoir 1 personnage de Rang A.", count: 1 },
        { id: "VILLAGE.A.c10", label: "Élire 1 Shodaime Hokage.", count: 1 },
        { id: "VILLAGE.A.c11", label: "Avoir 1 personnage s'étant élevé au Titre de Sannin.", count: 1 },
        { id: "VILLAGE.A.c12", label: "Vaincre 1 recherché du Bingo Book.", count: 1 },
        { id: "VILLAGE.A.c13", label: "Rencontrer 1 Bijuu.", count: 1 },
      ],
      individual: {
        xp: 500,
        alternatives: [
          { id: "VILLAGE.A.i1", label: "Atteindre 400 XP générés au total.", count: 400 },
          { id: "VILLAGE.A.i2", label: "Utiliser dans 10 RP différents le Kinjutsu de Konoha.", count: 10 },
          { id: "VILLAGE.A.i3", label: "Participer à 2 Missions D, C et B avantageant le Village par pays étranger.", count: 2 },
          { id: "VILLAGE.A.i4", label: "Contribuer à la validation d'un Atout pour le village.", count: 1 },
          { id: "VILLAGE.A.i5", label: "Occuper ou avoir occupé une fonction d'autorité dans le village.", count: 1 },
        ],
      },
      rewards: [
        "Débloque la Quintessence d'un Art Shinobi expertisé (Genjutsu multicible, scellement à distance, mudra à une main…). Cumulable avec la Quintessence de KG (Clan) ou un second Kekkei Genkai (Histoire).",
        "Débloque l'accès au Marché Noir (intrigues rares, singulières et ambitieuses).",
        "Débloque le Rang B comme choix de Rang de Départ pour toute nouvelle fiche de présentation.",
        "Débloque l'accès à ??? no Kuni.",
      ],
    },
    {
      rank: "S",
      flavorCommunity:
        "Konoha atteint le pinacle de son âge d'or et devient une puissance capable de remodeler le monde shinobi.",
      flavorIndividual:
        "Le personnage atteint le statut de figure historique de Konoha, dont le nom marque à jamais son identité.",
      community: [
        { id: "VILLAGE.S.c1", label: "Vaincre 5 recherchés de Rang S du Bingo Book.", count: 5 },
        { id: "VILLAGE.S.c2", label: "Réaliser 3 intrigues S du Marché Noir.", count: 3 },
        { id: "VILLAGE.S.c3", label: "Avoir 1 Clan de Rang S.", count: 1 },
        { id: "VILLAGE.S.c4", label: "Contrôler ou s'allier à 1 Bijuu.", count: 1 },
      ],
      individual: {
        xp: 2000,
        alternatives: [
          { id: "VILLAGE.S.i1", label: "Atteindre 1000 XP générés au total.", count: 1000 },
          { id: "VILLAGE.S.i2", label: "Participer à 1 chute de recherché S.", count: 1 },
          { id: "VILLAGE.S.i3", label: "Participer à 1 intrigue S du Marché Noir.", count: 1 },
          { id: "VILLAGE.S.i4", label: "Participer à 1 conquête de Bijuu.", count: 1 },
        ],
      },
      rewards: [
        "Débloque le Rang A comme choix de Rang de Départ pour toute nouvelle fiche de présentation.",
        "Débloque l'accès à Yami no Kuni.",
      ],
    },
  ],
};

// ============================================================
// VOIE DU CLAN
// ============================================================
const CLAN: ProgTrackDef = {
  key: "CLAN",
  label: "Clan",
  kanji: "氏",
  scope: "CLAN",
  intro:
    "La voie de la puissance collective : préserver l'héritage du clan, inspirer la crainte ou étendre son influence, et hisser son nom au-dessus de tous les autres.",
  paliers: [
    {
      rank: "E",
      flavorCommunity:
        "Le Clan n'existe encore qu'à l'état d'esquisse et n'est pas reconnu officiellement dans le monde shinobi.",
      flavorIndividual:
        "Le personnage est en marge des dynamiques internes de sa lignée ou ne cherche pas à y trouver sa place.",
      rewards: [
        "Débloque l'accès aux missions libres. Ton personnage peut en orienter les conséquences pour renforcer sa branche, accroître l'influence de son clan ou préparer de futurs enjeux internes.",
      ],
    },
    {
      rank: "D",
      flavorCommunity:
        "Le Clan se manifeste ouvertement et prend sa place dans le paysage du monde shinobi.",
      flavorIndividual:
        "Le personnage commence à trouver sa place au sein de sa branche et à s'identifier à l'héritage de sa lignée.",
      community: [
        { id: "CLAN.D.c1", label: "Atteindre 100 XP cumulés à l'échelle du clan.", count: 100 },
        { id: "CLAN.D.c2", label: "Réaliser 10 missions de Rang D avantageant le Clan.", count: 10 },
        { id: "CLAN.D.c3", label: "Réaliser 10 RP libres pour faire rayonner son Clan dans Konoha.", count: 10 },
        { id: "CLAN.D.c4", label: "Réaliser 5 RP trivia sur son Clan.", count: 5 },
        { id: "CLAN.D.c5", label: "Réaliser 5 RP Défis avec un membre du clan.", count: 5 },
        { id: "CLAN.D.c6", label: "Utiliser dans 5 RP une action unique en lien avec son Kekkei Genkai.", count: 5 },
        { id: "CLAN.D.c7", label: "Avoir 1 personnage de Rang D.", count: 1 },
      ],
      individual: {
        xp: 10,
        alternatives: [
          { id: "CLAN.D.i1", label: "Participer à 1 RP Défi interne au Clan.", count: 1 },
          { id: "CLAN.D.i2", label: "Participer à 1 RP Libre mettant en avant le Clan.", count: 1 },
          { id: "CLAN.D.i3", label: "Utiliser dans 1 RP une action unique en lien avec son Kekkei Genkai.", count: 1 },
        ],
      },
      rewards: [
        "Débloque les techniques signatures liées à ton Kekkei Genkai (manifestation unique de ton pouvoir, ex : contrôle du diamant pour le Shoton). Coûte 20 XP et doit apparaître dans 1 RP pour être validée.",
        "Débloque la possibilité de fonder ta propre branche (via un RP Intrigue dédié) : elle devient autonome et cesse de partager la complétion des conditions communes de sa lignée d'origine.",
        "Débloque officiellement le titre de Clan Mineur : lignée protégée par le Village, hors des 5 Clans Fondateurs.",
      ],
    },
    {
      rank: "C",
      flavorCommunity:
        "Le Clan se renforce et voit son influence comme son prestige s'affirmer par les lignées établies.",
      flavorIndividual:
        "Le personnage s'intègre pleinement au fonctionnement de sa branche et devient l'un de ses rouages essentiels.",
      community: [
        { id: "CLAN.C.c1", label: "Atteindre 200 XP cumulés à l'échelle du clan.", count: 200 },
        { id: "CLAN.C.c2", label: "Réaliser 10 missions de Rang C avantageant le Clan.", count: 10 },
        { id: "CLAN.C.c3", label: "Réaliser 10 RP libres pour faire rayonner son Clan à Hi.", count: 10 },
        { id: "CLAN.C.c4", label: "Utiliser dans 10 RP une technique signature (Kekkei Genkai).", count: 10 },
        { id: "CLAN.C.c5", label: "Réaliser 5 RP Défis avec un membre d'un autre clan.", count: 5 },
        { id: "CLAN.C.c6", label: "Réaliser 5 RP Libres d'entraide avec un autre clan.", count: 5 },
        { id: "CLAN.C.c7", label: "Réaliser 5 RP Libres de rivalité avec un autre clan.", count: 5 },
        { id: "CLAN.C.c8", label: "Utiliser dans 5 RP une action chargée et/ou évolutive en lien avec son Kekkei Genkai.", count: 5 },
        { id: "CLAN.C.c9", label: "Avoir 1 personnage de Rang C.", count: 1 },
      ],
      individual: {
        xp: 20,
        alternatives: [
          { id: "CLAN.C.i1", label: "Participer à 1 mission de Rang C avantageant le Clan.", count: 1 },
          { id: "CLAN.C.i2", label: "Participer à 1 RP au choix avec un membre d'un autre Clan.", count: 1 },
          { id: "CLAN.C.i3", label: "Utiliser dans 1 RP une action chargée et/ou évolutive en lien avec son Kekkei Genkai.", count: 1 },
        ],
      },
      rewards: [
        "Débloque la possibilité d'imposer un Kumite (affrontement non mortel) pour fusionner deux branches ou une branche et le clan principal. La victoire redessine l'organisation interne du clan.",
        "Débloque la possibilité de proposer des missions au reste du village (comptabilisées automatiquement dans les conditions communes).",
        "Réduit les exigences des missions de Rang B : 4 réponses au lieu de 5.",
        "Débloque la possibilité de lancer des RP Intrigues ou Projets au nom du clan (complots, alliances, avantages stratégiques, opérations d'influence…).",
      ],
    },
    {
      rank: "B",
      flavorCommunity:
        "Le Clan devient une référence reconnue et s'impose comme un modèle parmi les clans shinobi.",
      flavorIndividual:
        "Le personnage devient une figure notable perçue comme un membre influent au sein même de sa branche.",
      community: [
        { id: "CLAN.B.c1", label: "Atteindre 500 XP cumulés à l'échelle du clan.", count: 500 },
        { id: "CLAN.B.c2", label: "Réaliser 15 missions de rang B avantageant le Clan.", count: 15 },
        { id: "CLAN.B.c3", label: "Valider 10 Missions de Rang B par des membres externes au Clan.", count: 10 },
        { id: "CLAN.B.c4", label: "Utiliser dans 5 RP une action combinée en lien avec son Kekkei Genkai.", count: 5 },
        { id: "CLAN.B.c5", label: "Réaliser 3 projets claniques déterminés collectivement.", count: 3 },
        { id: "CLAN.B.c6", label: "Réaliser 2 RP libres par pays étranger (rayonner).", count: 2 },
        { id: "CLAN.B.c7", label: "Sceller une alliance avec un autre clan par 1 Kumite.", count: 1 },
        { id: "CLAN.B.c8", label: "Éteindre une rivalité avec un autre clan par 1 Kumite.", count: 1 },
        { id: "CLAN.B.c9", label: "Sceller une alliance avec un autre clan par diplomatie.", count: 1 },
        { id: "CLAN.B.c10", label: "Éteindre une rivalité avec un autre clan par diplomatie.", count: 1 },
        { id: "CLAN.B.c11", label: "Avoir 1 personnage de Rang B.", count: 1 },
      ],
      individual: {
        xp: 50,
        alternatives: [
          { id: "CLAN.B.i1", label: "Participer à 1 mission de Rang B avantageant le Clan.", count: 1 },
          { id: "CLAN.B.i2", label: "Contribuer à 1 Projet clanique.", count: 1 },
          { id: "CLAN.B.i3", label: "Participer à 1 RP rayonnement dans un pays étranger.", count: 1 },
          { id: "CLAN.B.i4", label: "Utiliser dans 1 RP une action combinée en lien avec son Kekkei Genkai.", count: 1 },
        ],
      },
      rewards: [
        "Débloque la Quintessence du Kekkei Genkai : dépasser les limites de ton héritage contre 100 XP.",
        "Débloque les techniques collectives à deux : actions synchronisées avec un partenaire du clan (2 RP Défis pour stabiliser la coordination).",
        "Débloque le Kinjutsu du Clan ou d'une branche (ex : Mokuton anti-anomalie pour les Senju, Izanami pour les Uchiha, Shiki Fujin pour les Uzumaki…).",
        "Débloque la possibilité de prétendre au statut de Clan de Konoha (système de Grade Spécial / influence) et de rejoindre les Clans Fondateurs.",
      ],
    },
    {
      rank: "A",
      flavorCommunity:
        "Le Clan s'élève au-dessus de ses contemporains et démarre son ascension vers les sommets du monde shinobi.",
      flavorIndividual:
        "Le personnage s'impose comme un représentant emblématique dont l'influence dépasse les cercles du clan.",
      community: [
        { id: "CLAN.A.c1", label: "Atteindre 2000 XP cumulés à l'échelle du clan.", count: 2000 },
        { id: "CLAN.A.c2", label: "Réaliser 5 missions D, C et B avantageant le Clan par pays étrangers.", count: 5 },
        { id: "CLAN.A.c3", label: "Utiliser dans 10 RP une Quintessence (Kekkei Genkai).", count: 10 },
        { id: "CLAN.A.c4", label: "Utiliser dans 10 RP une action tag-team à 2 avec un membre du Clan.", count: 10 },
        { id: "CLAN.A.c5", label: "Utiliser dans 10 RP une action ultime en lien avec son Kekkei Genkai.", count: 10 },
        { id: "CLAN.A.c6", label: "Avoir 5 Titres cumulés au sein du Clan.", count: 5 },
        { id: "CLAN.A.c7", label: "Avoir 1 personnage de Rang A.", count: 1 },
        { id: "CLAN.A.c8", label: "Débloquer 1 Quintessence (Kekkei Genkai).", count: 1 },
        { id: "CLAN.A.c9", label: "Dissoudre un Clan externe à Konoha par la voie du Kumite.", count: 1 },
      ],
      individual: {
        xp: 500,
        alternatives: [
          { id: "CLAN.A.i1", label: "Atteindre 400 XP générés.", count: 400 },
          { id: "CLAN.A.i2", label: "Contribuer à la destruction d'un Clan externe à Konoha.", count: 1 },
          { id: "CLAN.A.i3", label: "Participer à 1 mission D, C et B avantageant le Clan par pays étrangers.", count: 1 },
          { id: "CLAN.A.i4", label: "Utiliser dans 3 RP une action tag-team à 2 avec un membre du Clan.", count: 3 },
          { id: "CLAN.A.i5", label: "Avoir 1 Titre.", count: 1 },
        ],
      },
      rewards: [
        "Débloque une intrigue clanique majeure centrée sur le Kekkei Genkai (trame narrative collective). Sa résolution est indispensable pour accéder à la version ultime du Kekkei Genkai.",
        "Porte à 4 le nombre d'actions réalisables par tour (une action supplémentaire par combat).",
        "Débloque la supériorité des techniques signatures : à rang égal, elles surpassent très légèrement toute autre action.",
      ],
    },
    {
      rank: "S",
      flavorCommunity:
        "Le Clan domine le monde shinobi et inscrit définitivement son nom dans l'Histoire.",
      flavorIndividual:
        "Le personnage devient une légende clanique dont l'impact définit et transcende l'histoire de sa lignée.",
      community: [
        { id: "CLAN.S.c1", label: "Utiliser dans 500 RP le Kekkei Genkai à l'échelle du Clan.", count: 500 },
        { id: "CLAN.S.c2", label: "Utiliser dans 100 RP la technique signature améliorée.", count: 100 },
        { id: "CLAN.S.c3", label: "Utiliser dans 50 RP une Quintessence (Kekkei Genkai).", count: 50 },
        { id: "CLAN.S.c4", label: "Utiliser dans 20 RP le Kinjutsu clanique.", count: 20 },
        { id: "CLAN.S.c5", label: "Utiliser dans 10 RP une action ultime en lien avec son Kekkei Genkai.", count: 10 },
        { id: "CLAN.S.c6", label: "Vaincre le recherché de Rang S en rapport à son Clan.", count: 1 },
        { id: "CLAN.S.c7", label: "Réaliser collectivement l'intrigue clanique.", count: 1 },
        { id: "CLAN.S.c8", label: "Conquérir un pays étranger par la voie du Kumite.", count: 1 },
        { id: "CLAN.S.c9", label: "Avoir 1 personnage de Rang S.", count: 1 },
        { id: "CLAN.S.c10", label: "Avoir 1 Chef de Clan.", count: 1 },
        { id: "CLAN.S.c11", label: "Avoir 1 personnage s'étant élevé au Titre de Sannin.", count: 1 },
        { id: "CLAN.S.c12", label: "Avoir eu, au moins, un Hokage provenant du Clan.", count: 1 },
      ],
      individual: {
        xp: 2000,
        alternatives: [
          { id: "CLAN.S.i1", label: "Atteindre 1000 XP générés.", count: 1000 },
          { id: "CLAN.S.i2", label: "Utiliser dans 2 RP le Kinjutsu clanique.", count: 2 },
          { id: "CLAN.S.i3", label: "Participer à 1 chute de recherché S en lien avec le Clan.", count: 1 },
          { id: "CLAN.S.i4", label: "Participer à la réalisation de l'intrigue clanique.", count: 1 },
        ],
      },
      rewards: [
        "Débloque la forme ultime du Kekkei Genkai (ex : Senpo Mokuton pour les Senju, Mangekyo Sharingan Éternel pour les Uchiha, Edo Tensei pour les Uzumaki ; déterminée collectivement pour un clan créé).",
        "Ajoute à ton personnage une action suprême supplémentaire.",
      ],
    },
  ],
};

// ============================================================
// VOIE DE L'HISTOIRE (individuelle uniquement)
// ============================================================
const HISTOIRE: ProgTrackDef = {
  key: "HISTOIRE",
  label: "Histoire",
  kanji: "史",
  scope: "PERSO",
  intro:
    "La voie de l'égoïsme assumé : tout ce que le personnage entreprend pour lui-même, son ascension, ses secrets et ses ambitions personnelles — peu importe les répercussions sur le village ou le clan.",
  paliers: [
    {
      rank: "E",
      flavorIndividual:
        "Le personnage est aux balbutiements de sa trajectoire personnelle ou n'a pas encore défini ses ambitions.",
      rewards: [
        "Débloque l'accès aux missions libres. Ton personnage peut en orienter les conséquences pour servir ses intérêts, accroître son influence ou préparer de futurs projets personnels.",
        "Ton personnage débute avec la maîtrise d'un seul Art Shinobi, en dehors du Kuchiyose no Jutsu.",
      ],
    },
    {
      rank: "D",
      flavorIndividual:
        "Le personnage commence à émerger dans son environnement proche et à affirmer l'esquisse de son aventure.",
      individual: {
        xp: 50,
        alternatives: [
          { id: "HISTOIRE.D.i1", label: "Utiliser dans 5 RP un Art Shinobi.", count: 5 },
          { id: "HISTOIRE.D.i2", label: "Réaliser 3 RP Libres avec des membres différents du village.", count: 3 },
          { id: "HISTOIRE.D.i3", label: "Réaliser 2 Missions de Rang D.", count: 2 },
        ],
      },
      rewards: [
        "Débloque la maîtrise d'une affinité élémentaire au choix (Katon, Futon, Raiton, Doton, Suiton).",
        "Ton personnage maîtrise désormais deux Arts Shinobi, en dehors du Kuchiyose no Jutsu.",
        "Débloque les techniques signatures non héréditaires (manifestation unique de ton affinité ou Art, ex : feu bleu, foudre noire, 7 armes…). Coûte 5 XP et doit apparaître dans 1 RP pour être validée.",
      ],
    },
    {
      rank: "C",
      flavorIndividual:
        "Le personnage trouve une place identifiable dans le tissu du monde qui l'entoure.",
      individual: {
        xp: 150,
        alternatives: [
          { id: "HISTOIRE.C.i1", label: "Utiliser dans 5 RP un Art Shinobi.", count: 5 },
          { id: "HISTOIRE.C.i2", label: "Utiliser dans 5 RP son affinité élémentaire initiale.", count: 5 },
          { id: "HISTOIRE.C.i3", label: "Réaliser 3 RP Trivia internes à Hi, dont au moins 1 relatif à Konoha.", count: 3 },
          { id: "HISTOIRE.C.i4", label: "Réaliser 3 missions de Rang C.", count: 3 },
          { id: "HISTOIRE.C.i5", label: "Définir une technique signature (non héréditaire).", count: 1 },
        ],
      },
      rewards: [
        "Débloque la possibilité de conclure un pacte Kuchiyose (contrat avec une espèce animale dotée de Chakra) contre 20 XP. Chaque invocation maîtrise une affinité et un seul Art Shinobi. Le pacte doit apparaître dans 1 RP pour être validé.",
        "Débloque l'accès aux RP Intrigues pour structurer la trajectoire de ton personnage.",
        "Ton personnage maîtrise désormais trois Arts Shinobi, en dehors du Kuchiyose no Jutsu.",
        "Débloque la possibilité de mener trois missions libres simultanées, au lieu de deux.",
      ],
    },
    {
      rank: "B",
      flavorIndividual:
        "Le personnage devient une figure notable de son époque et s'impose comme une présence influente.",
      individual: {
        xp: 300,
        alternatives: [
          { id: "HISTOIRE.B.i1", label: "Atteindre 50 réponses RP postées.", count: 50 },
          { id: "HISTOIRE.B.i2", label: "Utiliser dans 10 RP sa technique signature (non héréditaire).", count: 10 },
          { id: "HISTOIRE.B.i3", label: "Réaliser 5 missions de Rang B.", count: 5 },
          { id: "HISTOIRE.B.i4", label: "Utiliser dans 5 RP un Art Shinobi.", count: 5 },
          { id: "HISTOIRE.B.i5", label: "Réaliser 1 RP Trivia par pays étranger.", count: 1 },
          { id: "HISTOIRE.B.i6", label: "Utiliser dans 5 RP son Kuchiyose.", count: 5 },
          { id: "HISTOIRE.B.i7", label: "Pactiser avec un Kuchiyose.", count: 1 },
          { id: "HISTOIRE.B.i8", label: "Réaliser 1 Intrigue personnelle.", count: 1 },
          { id: "HISTOIRE.B.i9", label: "Avoir 1 Titre.", count: 1 },
        ],
        extras: [
          {
            id: "HISTOIRE.B.x1",
            label: "Pour accéder en plus à l'intrigue anomalie (optionnel)",
            choices: [
              { id: "HISTOIRE.B.x1.1", label: "Purifier 20 Anomalies (voie E).", count: 20 },
              { id: "HISTOIRE.B.x1.2", label: "Aggraver 20 Anomalies (voie J).", count: 20 },
              { id: "HISTOIRE.B.x1.3", label: "Purifier 15 Anomalies et aggraver 15 Anomalies (voie O)." },
            ],
          },
        ],
      },
      rewards: [
        "Débloque la maîtrise d'une seconde affinité élémentaire.",
        "Ton personnage maîtrise désormais tous les Arts Shinobi.",
        "Débloque une intrigue majeure centrée sur les Anomalies (trame personnelle dédiée à l'un des 3 Modes Spéciaux : Ermite, Jinchuriki, Otsutsuki). Tu obtiens le Pré-stade du Mode choisi.",
      ],
    },
    {
      rank: "A",
      flavorIndividual:
        "Le personnage s'élève parmi les influences majeures de son époque et les dépasse par sa trajectoire.",
      individual: {
        xp: 1000,
        alternatives: [
          { id: "HISTOIRE.A.i1", label: "Avoir terminé 50 RP.", count: 50 },
          { id: "HISTOIRE.A.i2", label: "Réaliser 1 Mission de Rang D, C, B par pays étranger.", count: 1 },
          { id: "HISTOIRE.A.i3", label: "Acheter 10 marchandises de la boutique.", count: 10 },
          { id: "HISTOIRE.A.i4", label: "Utiliser dans 5 RP sa seconde affinité élémentaire.", count: 5 },
          { id: "HISTOIRE.A.i5", label: "Utiliser dans 15 RP un Art Shinobi.", count: 15 },
          { id: "HISTOIRE.A.i6", label: "Obtenir un Grade Spécial.", count: 1 },
          { id: "HISTOIRE.A.i7", label: "Réaliser les objectifs imposés par l'intrigue anomalie.", count: 1 },
          { id: "HISTOIRE.A.i8", label: "Participer à 1 Anomalie narrée minimum.", count: 1 },
        ],
        extras: [
          {
            id: "HISTOIRE.A.x1",
            label: "Pour accéder en plus au Mode Spécial initial (optionnel)",
            choices: [
              { id: "HISTOIRE.A.x1.1", label: "Purifier 50 Anomalies au total (voie E).", count: 50 },
              { id: "HISTOIRE.A.x1.2", label: "Aggraver 50 Anomalies au total (voie J).", count: 50 },
              { id: "HISTOIRE.A.x1.3", label: "Purifier 30 Anomalies et aggraver 30 Anomalies au total (voie O)." },
            ],
          },
        ],
      },
      rewards: [
        "Débloque la Quintessence : 2e KG. Éveiller un second Kekkei Genkai (canonique ou inventé) contre 100 XP.",
        "Permet d'atteindre le stade initial d'un Mode Spécial.",
        "Débloque la supériorité d'un Art Shinobi : à rang égal, il surpasse très légèrement toute autre action.",
        "Débloque l'accès à l'expertise de trois Arts Shinobi (les hisser au Rang A puis S). L'expertise du Kuchiyose passe par le Mode Ermite.",
      ],
    },
    {
      rank: "S",
      flavorIndividual:
        "Le personnage dépasse son époque et s'impose comme une légende vivante dont l'influence traverse les générations.",
      individual: {
        xp: 2000,
        alternatives: [
          { id: "HISTOIRE.S.i1", label: "Atteindre les 1500 XP générés.", count: 1500 },
          { id: "HISTOIRE.S.i2", label: "Triompher d'une Anomalie narrée continentale.", count: 1 },
          { id: "HISTOIRE.S.i3", label: "Utiliser sa Quintessence (Kekkei Genkai+ ou 2e Kekkei Genkai) dans 20 RP.", count: 20 },
          { id: "HISTOIRE.S.i4", label: "Réaliser 5 Intrigues personnelles au total.", count: 5 },
          { id: "HISTOIRE.S.i5", label: "Vaincre 1 recherché du Bingo Book.", count: 1 },
          { id: "HISTOIRE.S.i6", label: "Débloquer une Quintessence (Kekkei Genkai+ ou 2e Kekkei Genkai).", count: 1 },
          { id: "HISTOIRE.S.i7", label: "Atteindre le Mode Spécial initial.", count: 1 },
          { id: "HISTOIRE.S.i8", label: "Remplir les conditions du Mode Spécial final.", count: 1 },
        ],
        extras: [
          {
            id: "HISTOIRE.S.x1",
            label: "Pour accéder au Mode Spécial final (obligatoire)",
            required: true,
            choices: [
              { id: "HISTOIRE.S.x1.1", label: "Purifier 100 Anomalies au total (voie E).", count: 100 },
              { id: "HISTOIRE.S.x1.2", label: "Aggraver 100 Anomalies au total (voie J).", count: 100 },
              { id: "HISTOIRE.S.x1.3", label: "Purifier 60 Anomalies et aggraver 60 Anomalies au total (voie O)." },
            ],
          },
        ],
      },
      rewards: [
        "Permet d'atteindre le stade final d'un Mode Spécial.",
        "Ajoute à ton personnage une action suprême supplémentaire.",
      ],
    },
  ],
};

// ============================================================
// REGISTRE + HELPERS
// ============================================================
export const PROGRESSION: Record<ProgTrack, ProgTrackDef> = {
  VILLAGE,
  CLAN,
  HISTOIRE,
};

export const PROGRESSION_LIST: ProgTrackDef[] = [VILLAGE, CLAN, HISTOIRE];

export function trackDef(track: ProgTrack): ProgTrackDef {
  return PROGRESSION[track];
}

export type ProgTier = "COMMUNITY" | "INDIVIDUAL";

// ------------------------------------------------------------
// Mode d'une condition :
//   - "count"   : compteur incrémental. Chaque RP validé compte +1, cible = N.
//   - "oneshot" : état / accomplissement vérifié UNE fois (ex : « Avoir 5
//                 personnages de Rang D »). Une seule validation suffit.
//   - "xp_pool" : AUTO — XP cumulés du scope (somme des membres village/clan).
//   - "xp_self" : AUTO — XP « générés » du joueur.
//   - "member_count" : AUTO — nombre de personnages du scope (village/clan) dont
//                 le rang général ≥ rang du palier (« Avoir N personnages de Rang X »).
// Classement par jeu d'ids : tout le reste est un compteur (`count`).
// ------------------------------------------------------------
export type CondMode = "count" | "oneshot" | "xp_pool" | "xp_self" | "member_count";

// XP communautaire (« Atteindre N XP cumulés à l'échelle du village/clan »).
const XP_POOL_IDS = new Set<string>([
  "VILLAGE.D.c1", "VILLAGE.C.c1", "VILLAGE.B.c1", "VILLAGE.A.c1",
  "CLAN.D.c1", "CLAN.C.c1", "CLAN.B.c1", "CLAN.A.c1",
]);

// XP individuel (« Atteindre N XP générés »).
const XP_SELF_IDS = new Set<string>([
  "VILLAGE.A.i1", "VILLAGE.S.i1", "CLAN.A.i1", "CLAN.S.i1", "HISTOIRE.S.i1",
]);

// Conditions d'état/accomplissement : une seule validation (pas de compteur).
// Inclut aussi les seuils cumulés sans source auto (« N réponses RP postées »,
// « Avoir terminé N RP ») : le staff vérifie le total du forum et valide une fois,
// plutôt que d'exiger N soumissions séparées.
const ONESHOT_IDS = new Set<string>([
  "VILLAGE.D.c2",
  "VILLAGE.C.c2", "VILLAGE.C.c10",
  "VILLAGE.B.c2", "VILLAGE.B.c7",
  "VILLAGE.A.c2", "VILLAGE.A.c6", "VILLAGE.A.c7", "VILLAGE.A.c8",
  "VILLAGE.A.c10", "VILLAGE.A.c11", "VILLAGE.A.c12", "VILLAGE.A.c13", "VILLAGE.A.i4", "VILLAGE.A.i5",
  "VILLAGE.S.c3", "VILLAGE.S.c4",
  "CLAN.B.c7", "CLAN.B.c8", "CLAN.B.c9", "CLAN.B.c10",
  "CLAN.A.c6", "CLAN.A.c8", "CLAN.A.c9", "CLAN.A.i2", "CLAN.A.i5",
  "CLAN.S.c6", "CLAN.S.c7", "CLAN.S.c8", "CLAN.S.c10", "CLAN.S.c11", "CLAN.S.c12",
  "HISTOIRE.C.i5",
  "HISTOIRE.B.i1", "HISTOIRE.B.i7", "HISTOIRE.B.i9", "HISTOIRE.B.x1.3",
  "HISTOIRE.A.i1", "HISTOIRE.A.i6", "HISTOIRE.A.i7", "HISTOIRE.A.x1.3",
  "HISTOIRE.S.i2", "HISTOIRE.S.i6", "HISTOIRE.S.i7", "HISTOIRE.S.i8", "HISTOIRE.S.x1.3",
]);

// « Avoir N personnages de Rang X » — AUTO : compte les personnages du scope
// (village = tous · clan = ses membres) dont le rang général ≥ rang du palier.
// La cible N = `count` ; le seuil de rang = le rang du palier de la condition.
const MEMBER_COUNT_IDS = new Set<string>([
  "VILLAGE.D.c8", "VILLAGE.C.c9", "VILLAGE.B.c6", "VILLAGE.A.c9",
  "CLAN.D.c7", "CLAN.C.c9", "CLAN.B.c11", "CLAN.A.c7", "CLAN.S.c9",
]);

// Conditions « gérées par le staff » : non soumettables par les membres ; le
// staff les valide directement (ex : « Atteindre N réponses RP postées au total
// sur le forum » — un cumul global qu'aucun membre ne « soumet »).
export const ADMIN_MANAGED_IDS = new Set<string>([
  "VILLAGE.D.c2", "VILLAGE.C.c2", "VILLAGE.B.c2", "VILLAGE.A.c2",
]);

export function isAdminManaged(id: string): boolean {
  return ADMIN_MANAGED_IDS.has(id);
}

// Conditions qui doivent rester des demandes de validation manuelle.
const MANUAL_REVIEW_IDS = new Set<string>(["HISTOIRE.B.i1", "HISTOIRE.A.i1"]);

// Conditions qui exigent de saisir les pseudos exacts des autres participants.
// Règle métier actuelle : RP libres / trivia / défis / missions = co-participants requis.
const GROUP_SUBMISSION_RE =
  /\bRP\s+Libres?\b|\bRP\s+D[ée]fis?\b|\bRP\s+Trivia\b|\bMissions?\b/i;

export type SubmissionMode = "SOLO" | "GROUP" | "MANUAL";

export function submissionMode(id: string): SubmissionMode {
  if (MANUAL_REVIEW_IDS.has(id)) return "MANUAL";
  const label = COND_CATALOG.get(id)?.label ?? "";
  return GROUP_SUBMISSION_RE.test(label) ? "GROUP" : "SOLO";
}

export function requiresCollaborators(id: string): boolean {
  return submissionMode(id) === "GROUP";
}

export function isManualReviewSubmission(id: string): boolean {
  return submissionMode(id) === "MANUAL";
}

export function condMode(id: string): CondMode {
  if (XP_POOL_IDS.has(id)) return "xp_pool";
  if (XP_SELF_IDS.has(id)) return "xp_self";
  if (MEMBER_COUNT_IDS.has(id)) return "member_count";
  if (ONESHOT_IDS.has(id)) return "oneshot";
  return "count";
}

// Cible d'une condition : compteur → N (≥1) ; oneshot → 1 ; xp_* / member_count → seuil N.
export function condTarget(id: string, count?: number): number {
  const mode = condMode(id);
  if (mode === "oneshot") return 1;
  if (mode === "count") return Math.max(1, count ?? 1);
  return count ?? 0; // xp_pool / xp_self / member_count
}

// Une condition AUTO n'est jamais soumise (calculée depuis l'XP ou les membres).
export function isAutoMode(m: CondMode): boolean {
  return m === "xp_pool" || m === "xp_self" || m === "member_count";
}

// Métadonnée d'une condition résolue depuis son id (validation serveur).
export interface CondMeta {
  id: string;
  track: ProgTrack;
  rank: Rank;
  tier: ProgTier;
  label: string;
  count?: number;
  mode: CondMode;
  target: number;
  adminManaged: boolean;
}

// Catalogue plat id → métadonnée. Toute soumission est vérifiée contre ce
// catalogue : un id inconnu est rejeté.
export const COND_CATALOG: Map<string, CondMeta> = (() => {
  const map = new Map<string, CondMeta>();
  const add = (c: ProgCond, track: ProgTrack, rank: Rank, tier: ProgTier) =>
    map.set(c.id, {
      id: c.id,
      track,
      rank,
      tier,
      label: c.label,
      count: c.count,
      mode: condMode(c.id),
      target: condTarget(c.id, c.count),
      adminManaged: isAdminManaged(c.id),
    });
  for (const def of PROGRESSION_LIST) {
    for (const p of def.paliers) {
      for (const c of p.community ?? []) add(c, def.key, p.rank, "COMMUNITY");
      if (p.individual) {
        for (const c of p.individual.alternatives) add(c, def.key, p.rank, "INDIVIDUAL");
        for (const ex of p.individual.extras ?? []) {
          for (const c of ex.choices) add(c, def.key, p.rank, "INDIVIDUAL");
        }
      }
    }
  }
  return map;
})();

export function condMeta(id: string): CondMeta | undefined {
  return COND_CATALOG.get(id);
}

// Clé de scope d'une condition communautaire :
//   - Village → "konoha" (le forum n'a qu'un village).
//   - Clan    → nom du clan normalisé (clé partagée par tous ses membres).
// Les conditions individuelles ne portent pas de scope (rattachées au joueur).
export const VILLAGE_SCOPE_KEY = "konoha";

export function clanScopeKey(clan: string | null | undefined): string | null {
  const c = (clan ?? "").trim();
  return c ? c.toLowerCase() : null;
}

export function scopeKeyFor(
  track: ProgTrack,
  tier: ProgTier,
  clan: string | null | undefined
): string | null {
  if (tier !== "COMMUNITY") return null;
  if (track === "VILLAGE") return VILLAGE_SCOPE_KEY;
  if (track === "CLAN") return clanScopeKey(clan);
  return null;
}

// Le palier d'un track au rang donné (E..S).
export function palierAt(track: ProgTrack, rank: Rank): ProgPalier | undefined {
  return PROGRESSION[track].paliers.find((p) => p.rank === rank);
}

// Normalise un lien de RP → clé stable d'identité (anti-réutilisation).
// Tolère une URL sans schéma, minuscule, sans slash final.
export function normalizeRpUrl(raw?: string | null): string | null {
  if (!raw) return null;
  let u = raw.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u.toLowerCase().replace(/\/+$/, "");
}

// ------------------------------------------------------------
// Contexte d'évaluation (compteurs validés + XP) → conditions remplies.
// ------------------------------------------------------------

// Progression communautaire d'un scope (village ou un clan).
export interface ScopeProgress {
  countByCond: Record<string, number>; // condId → nb de soumissions VALIDATED dans le scope
  xpPool: number; // XP cumulés du scope (somme des membres)
  memberCountByRank: Partial<Record<Rank, number>>; // nb de personnages du scope par rang général
}

// Progression individuelle d'un joueur.
export interface UserProgress {
  countByCond: Record<string, number>; // condId → nb de soumissions VALIDATED du joueur
  xpSelf: number; // XP « générés » du joueur
}

// Nb de personnages du scope dont le rang général ≥ `rank`.
export function membersAtLeast(byRank: Partial<Record<Rank, number>>, rank: Rank): number {
  let n = 0;
  for (let i = rankIndex(rank); i < RANKS.length; i++) n += byRank[RANKS[i]] ?? 0;
  return n;
}

export function communityCondMet(cond: ProgCond, sp: ScopeProgress): boolean {
  const mode = condMode(cond.id);
  if (mode === "xp_pool") return sp.xpPool >= condTarget(cond.id, cond.count);
  if (mode === "member_count") {
    const rank = COND_CATALOG.get(cond.id)?.rank ?? "E";
    return membersAtLeast(sp.memberCountByRank, rank) >= condTarget(cond.id, cond.count);
  }
  return (sp.countByCond[cond.id] ?? 0) >= condTarget(cond.id, cond.count);
}

export function individualCondMet(cond: ProgCond, up: UserProgress): boolean {
  if (condMode(cond.id) === "xp_self") return up.xpSelf >= condTarget(cond.id, cond.count);
  return (up.countByCond[cond.id] ?? 0) >= condTarget(cond.id, cond.count);
}

// Valeur courante affichée pour une condition (compteur, XP, ou nb de personnages).
export function communityCurrent(cond: ProgCond, sp: ScopeProgress): number {
  const mode = condMode(cond.id);
  if (mode === "xp_pool") return sp.xpPool;
  if (mode === "member_count") {
    const rank = COND_CATALOG.get(cond.id)?.rank ?? "E";
    return membersAtLeast(sp.memberCountByRank, rank);
  }
  return sp.countByCond[cond.id] ?? 0;
}
export function individualCurrent(cond: ProgCond, up: UserProgress): number {
  if (condMode(cond.id) === "xp_self") return up.xpSelf;
  return up.countByCond[cond.id] ?? 0;
}

// Rang communautaire DÉRIVÉ : plus haut palier dont TOUTES les conditions
// communautaires sont remplies (compteurs + XP auto).
export function deriveCommunityRank(track: ProgTrack, sp: ScopeProgress): Rank {
  const def = PROGRESSION[track];
  let reached: Rank = "E";
  for (const p of def.paliers) {
    if (p.rank === "E") continue;
    const conds = p.community ?? [];
    if (conds.length === 0) continue;
    if (conds.every((c) => communityCondMet(c, sp))) reached = p.rank;
    else break; // paliers ordonnés : on s'arrête au premier incomplet
  }
  return reached;
}

// Rang communautaire EFFECTIF = max(base posée par le staff, dérivé des conditions).
export function effectiveCommunityRank(track: ProgTrack, base: Rank, sp: ScopeProgress): Rank {
  const derived = deriveCommunityRank(track, sp);
  return rankIndex(derived) >= rankIndex(base) ? derived : base;
}

// Conditions individuelles d'un palier remplies ? (toutes les alternatives +
// chaque bloc `required`). Le raccourci XP est géré côté appelant (paiement).
export function individualConditionsMet(track: ProgTrack, rank: Rank, up: UserProgress): boolean {
  const p = palierAt(track, rank);
  if (!p || !p.individual) return true; // E (ou palier sans individuel)
  if (!p.individual.alternatives.every((c) => individualCondMet(c, up))) return false;
  for (const ex of p.individual.extras ?? []) {
    if (ex.required && !ex.choices.some((c) => individualCondMet(c, up))) return false;
  }
  return true;
}

// ------------------------------------------------------------
// Verrouillage des paliers (grisé + non soumettable).
//   DONE             : palier déjà atteint.
//   ACTIVE           : palier en cours — soumissions autorisées.
//   LOCKED           : palier futur — verrouillé.
//   LOCKED_COMMUNITY : palier individuel bloqué tant que le rang communautaire
//                      n'est pas atteint (« conditions communautaires d'abord »).
// ------------------------------------------------------------
export type PalierStatus = "DONE" | "ACTIVE" | "LOCKED" | "LOCKED_COMMUNITY";

export function communityPalierStatus(rank: Rank, effectiveCommRank: Rank): "DONE" | "ACTIVE" | "LOCKED" {
  const r = rankIndex(rank);
  const e = rankIndex(effectiveCommRank);
  if (r <= e) return "DONE";
  if (r === e + 1) return "ACTIVE";
  return "LOCKED";
}

export function individualPalierStatus(
  scope: ProgScope,
  rank: Rank,
  personalRank: Rank,
  effectiveCommRank: Rank
): PalierStatus {
  const r = rankIndex(rank);
  const p = rankIndex(personalRank);
  if (r <= p) return "DONE";
  if (r === p + 1) {
    if (scope !== "PERSO" && rankIndex(effectiveCommRank) < r) return "LOCKED_COMMUNITY";
    return "ACTIVE";
  }
  return "LOCKED";
}

// Garde serveur : une soumission n'est acceptée que si son palier est ACTIVE
// (et la condition n'est pas AUTO). Réutilise exactement la logique d'affichage.
export function submissionGate(
  meta: CondMeta,
  ctx: { personalRank: Rank; effectiveCommRank: Rank }
): { ok: boolean; reason?: string } {
  if (isAutoMode(meta.mode)) return { ok: false, reason: "AUTO" };
  const scope = PROGRESSION[meta.track].scope;
  if (meta.tier === "COMMUNITY") {
    const st = communityPalierStatus(meta.rank, ctx.effectiveCommRank);
    if (st === "DONE") return { ok: false, reason: "DEJA_ATTEINT" };
    if (st === "LOCKED") return { ok: false, reason: "VERROUILLE" };
    return { ok: true };
  }
  const st = individualPalierStatus(scope, meta.rank, ctx.personalRank, ctx.effectiveCommRank);
  if (st === "DONE") return { ok: false, reason: "DEJA_ATTEINT" };
  if (st === "LOCKED") return { ok: false, reason: "VERROUILLE" };
  if (st === "LOCKED_COMMUNITY") return { ok: false, reason: "COMMUNAUTE_REQUISE" };
  return { ok: true };
}

// ------------------------------------------------------------
// Auto-promotion (modèle « personnel à 2 degrés ») :
// le rang personnel d'un joueur monte tant que, pour le palier suivant,
// ses conditions individuelles sont remplies ET (Village/Clan) le rang
// communautaire effectif est atteint. Histoire : pas de gate communautaire.
// Ne descend JAMAIS (retourne au minimum le rang courant).
// ------------------------------------------------------------
export function highestPersonalRank(
  track: ProgTrack,
  currentRank: Rank,
  effectiveCommRank: Rank,
  up: UserProgress
): Rank {
  let reached: Rank = currentRank;
  for (let i = rankIndex(currentRank) + 1; i < RANKS.length; i++) {
    const target = RANKS[i];
    const communityOk = track === "HISTOIRE" || rankIndex(effectiveCommRank) >= i;
    if (communityOk && individualConditionsMet(track, target, up)) {
      reached = target;
    } else {
      break; // paliers ordonnés
    }
  }
  return reached;
}

export const TRACK_LABEL: Record<ProgTrack, string> = {
  VILLAGE: "Village",
  CLAN: "Clan",
  HISTOIRE: "Histoire",
};
