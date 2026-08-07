# Cahier des taches

## Fait
- Separer les progressions optionnelles par voie.
- Bloquer les voies alternatives une fois une voie de mode special choisie.
- Afficher des compteurs de RP `xx/15` pour les deux lignes Otsutsuki.
- Enregistrer la version courante avant soumission d'une fiche technique.
- Autoriser la modification et le retrait d'une fiche en attente de validation.
- Afficher les specialisations des techniques collectives avec le rang du lecteur/copieur.
- Centraliser la logique Kuchiyose sur l'invocation et non sur le joueur pour le calcul des specialisations.
- Forcer le rang d'invocation en automatique, avec plafond Rang B sans quintessence / mode Ermite.
- Rendre la specialisation Kuchiyose explicite dans les fiches techniques, y compris dans les vues admin.
- Afficher l'espece de l'invocation dans les vues techniques et dans la moderation admin.
- Appliquer une DA Kuchiyose sur les sections `Mes techniques`, `Bibliotheque de clan` et le preview technique.
- Simplifier les en-tetes Kuchiyose pour garder seulement les informations utiles a la page.
- Remanier les descriptions des sections techniques pour qu'elles expliquent clairement la page affichee.
- Retirer les badges decoratifs juges superflus sur les pages Kuchiyose et techniques.
- Ajouter un bouton FT dans l'editor RP pour inserer directement des cartes de techniques exportees depuis la fiche technique.
- Charger aussi les styles des techniques dans l'apercu RP afin que les cartes FT s'affichent correctement dans le code a droite.

## Boutique / Inventaire - en cours
- Ajouter une boutique connectee accessible depuis l'espace `Technique`, sans lien public dans le hub.
- Creer un catalogue boutique administrable en base via `ShopCatalogItem`, avec page admin `/admin/boutique`.
- Gerer les champs d'objet : cle stable, nom, categorie, cout XP, kanji, ressource, indice de rang, description, effet, ordre, et activation.
- Introduire deux types d'objets : `UNLIMITED` achetable plusieurs fois et `UNIQUE` achetable une seule fois.
- Distinguer visuellement les objets uniques avec un cadre / halo specifique.
- Ajouter un panier cote joueur avec total, XP restant, quantites et validation atomique.
- Debiter l'XP via transaction auditee `SHOP_SPEND` et enregistrer les achats dans `InventoryItem`.
- Griser les articles non achetables quand le joueur n'a pas assez d'XP ou quand le panier rend l'achat trop cher.
- Afficher l'inventaire dans le profil via un onglet qui alterne entre `Arts Shinobi` et `Inventaire`, sans supprimer l'affichage des arts.
- Garder un catalogue de secours cote code tant que la migration catalogue n'est pas disponible.
- Remplacer les anciennes categories de test par les familles officielles : `Reliques`, `Contes`, `Outils shinobi`, `DLC : Village C`, `Rumeurs`, `Trames`, `Services`.
- Charger le premier catalogue boutique complet : fragments de relique, contes, outils consommables, protections de contrÃ©es, rouleaux Village C, rumeurs, accÃ¨s JDC et services de progression / grade / trame.
- Donner une DA distincte aux familles d'objets via des accents couleurs et sceaux : reliques dorees, contes bleus, outils orange, Village C jade, rumeurs violettes, trames rouges, services papier/cachet.
- Corriger la liste des contes en couvrant `Ichibi` a `Kyuubi` : le doublon `Nanabi` de la liste source est traite comme `Nibi`.
- Modeliser les achats a prix progressif de reconquete de Contree en paliers visibles `300`, `600`, `900`, `1200` XP pour garder un panier simple.
- Afficher les services en sous-categories internes dans l'onglet unique `Services` : progression, grades, narratifs et boutique.
- Rendre les sous-categories boutique cliquables / depliables pour faciliter la navigation dans les longues listes.
- Afficher `Contes` en sous-categories `Bijuu` et `Claniques`.
- Afficher `Outils shinobi` en sous-categories `Consommables` et `Uniques`.
- Separer les `Reconquetes` des autres services de progression et les rendre incrementales a l'echelle du forum : un seul palier visible a la fois, augmente pour tout le monde apres chaque achat confirme.
- Stocker l'incrementation des `Reconquetes` dans un compteur global administrable, separe des objets deja acquis dans les inventaires.
- Permettre aux admins de baisser les `Reconquetes` d'un palier ou de remettre entierement a zero le compteur global.
- Envoyer une alerte admin persistante quand un joueur achete une `Reconquete`, avec le joueur, l'objet, le cout et le prochain palier global.
- Afficher au joueur, apres achat confirme d'une `Reconquete`, une boite de confirmation l'invitant a poster sa demande dans la section concernee du forum pour recuperer la zone perdue.
- Afficher/refuser les achats de suppression de condition selon le prochain rang exact de chaque voie : `Village`, `Clan` et `Histoire` scalent independamment avec le rang courant du joueur.
- Ajouter le palier `Rang C personnel` au catalogue pour couvrir la progression Histoire `D -> C`, en plus de `C -> B`, `B -> A` et `A -> S`.
- Faire sortir les suppressions de condition du panier : un clic ouvre une liste des prerequis actuels non remplis, puis l'achat debite l'XP directement, valide la condition choisie et recalcule la progression.
- Pour les voies `Clan` et `Village`, proposer d'abord les prerequis communautaires si le rang communautaire effectif bloque encore le palier, puis les prerequis individuels une fois ce verrou leve.
- Appliquer le bonus permanent `Reduction marchandises a vie` aux achats suivants : -25% calcule cote serveur, arrondi a l'XP superieur, avec affichage du prix barre/remise dans le panier.

## Boutique / Inventaire - a definir
- Effets exacts des objets et leur portee RP / mecanique.
- Ajouter les paliers de reconquete de Contree au-dela de `1200 XP` si la grille doit continuer automatiquement.
- Logique transactionnelle avancee hors achat simple, notamment pour la future idee autour de la revente / echanges.
- Eventuelles permissions staff pour attribuer, retirer ou corriger des objets dans l'inventaire d'un joueur.
