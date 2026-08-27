# PJD Maker — Architecture de référence

PJD Maker est une marketplace multi-vendeurs mobile-first. Le projet est organisé par domaines fonctionnels afin d'éviter que les écrans, la logique métier et l'accès aux données soient mélangés.

## 1. Domaines

- **Marketplace** : accueil, recherche, catégories, fiches produit, boutiques publiques, favoris.
- **Authentification** : connexion, inscription, session et profil.
- **Client** : panier, checkout, commandes, livraisons, avis.
- **Vendeur** : tableau de bord, boutique, produits/prix, stock, commandes, CRM, messages, finances, marketing, fidélité, parrainage, publicité, IA, opportunités, notifications, paramètres.
- **Administration** : utilisateurs, vendeurs, produits, commandes, paiements, commissions, retraits, promotions et configuration globale.
- **Monétisation** : commissions, abonnements vendeurs, codes promo, affiliation.
- **Paiements** : fournisseurs de paiement derrière des fonctions serveur; aucun secret de paiement dans le navigateur.
- **Fichiers** : Storage privé pour les fichiers numériques; URL signées délivrées après autorisation.

## 2. Règle d'architecture

Le navigateur ne décide jamais seul d'un montant, d'une commission, d'une remise, d'une autorisation ou d'une livraison de fichier. Les valeurs sensibles sont recalculées côté serveur et protégées par RLS/policies Supabase.

## 3. Organisation cible

```text
src/
  app/              # orchestration/navigation
  components/       # composants visuels réutilisables
  domains/
    marketplace/    # catalogue, recherche, boutiques
    auth/           # session et authentification
    customer/       # panier, commandes, livraisons
    seller/         # espace vendeur
    admin/          # administration
    commerce/       # promotions, commissions, paiements
  lib/
    supabase/       # accès Supabase et helpers
    validation/     # validations communes
    security/       # règles client non sensibles
  config/           # navigation, labels et constantes
  styles/           # styles globaux et domaine
supabase/
  migrations/       # schéma versionné
  functions/        # logique serveur
```

La migration doit être progressive : on ne déplace pas brutalement les fichiers existants. Les nouveaux modules suivent cette convention et les anciens composants sont migrés domaine par domaine.

## 4. Flux principaux

**Client** : produit → panier → validation promo → checkout → paiement → commande → livraison/téléchargement → avis.

**Vendeur** : boutique → produit → prix/stock → commande → exécution → commission → solde → retrait.

**Admin** : supervision → validation/modération → paiements/commissions → retraits → promotions → sécurité.

## 5. États métier

Les statuts doivent être centralisés et alignés sur les contraintes PostgreSQL. Une valeur inventée dans l'interface ne doit jamais être envoyée à `orders` ou aux tables financières.

## 6. Priorité de maintenance

1. Authentification et permissions.
2. Catalogue et médias.
3. Panier/checkout/commandes.
4. Paiements et commissions.
5. Portefeuille et retraits.
6. Codes promo/affiliation/abonnements.
7. Outils vendeur et croissance.
8. Administration, audit et notifications.

## 7. Qualité attendue

Chaque nouvelle fonction doit avoir :
- un écran clairement accessible depuis la navigation;
- une source de données Supabase identifiée;
- des permissions RLS adaptées;
- des états chargement/vide/erreur/succès;
- une validation mobile;
- une gestion d'erreur utilisateur compréhensible;
- une vérification de build avant mise en production.
