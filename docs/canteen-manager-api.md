# API de Gestion des Gestionnaires de Cantine

Cette documentation décrit les endpoints API pour gérer les comptes des gestionnaires de cantine dans le système Dabali Express.

## Scénario d'utilisation

### 1. Création d'un gestionnaire de cantine par le School Admin

**Endpoint:** `POST /api/users/canteen-managers`

**Authentification requise:** SCHOOL_ADMIN

**Corps de la requête:**
```json
{
  "first_name": "Traoré",
  "last_name": "Moussa",
  "email": "moussa.traore@school.bf",
  "phone": "+22670333333",
  "school_id": "64f1a2b3c4d5e6f7g8h9i0j1k2l"
}
```

**Réponse réussie:**
```json
{
  "success": true,
  "message": "Gestionnaire de cantine créé avec succès.",
  "data": {
    "user": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1k2l",
      "first_name": "Traoré",
      "last_name": "Moussa",
      "email": "moussa.traore@school.bf",
      "phone": "+22670333333",
      "role": "CANTEEN_MANAGER",
      "school": "École Primaire de Ouagadougou"
    },
    "temporary_password": "TempPass2024!",
    "instructions": {
      "message": "Veuillez communiquer ces identifiants au gestionnaire de cantine.",
      "security_note": "Le gestionnaire devra changer son mot de passe lors de la première connexion.",
      "password_display": "Afficher le mot de passe temporaire pour le copier-coller",
      "delivery_methods": [
        "Affichage à l'écran (copier-coller)",
        "SMS (si configuré)",
        "Email (si configuré)"
      ]
    }
  }
}
```

### 2. Première connexion du gestionnaire de cantine

**Endpoint:** `POST /api/auth/login`

**Corps de la requête:**
```json
{
  "email": "moussa.traore@school.bf",
  "password": "TempPass2024!"
}
```

**Réponse pour mot de passe temporaire:**
```json
{
  "success": true,
  "message": "Connexion réussie. Veuillez changer votre mot de passe.",
  "data": {
    "requires_password_change": true,
    "user": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1k2l",
      "email": "moussa.traore@school.bf",
      "first_name": "Traoré",
      "last_name": "Moussa",
      "role": "CANTEEN_MANAGER"
    }
  }
}
```

### 3. Changement du mot de passe temporaire

**Endpoint:** `POST /api/auth/change-temporary-password`

**Authentification requise:** Oui (token JWT)

**Corps de la requête:**
```json
{
  "current_password": "TempPass2024!",
  "new_password": "MonNouveauMotDePasse123!",
  "confirm_password": "MonNouveauMotDePasse123!"
}
```

**Réponse réussie:**
```json
{
  "success": true,
  "message": "Mot de passe changé avec succès. Vous pouvez maintenant utiliser l'application normalement."
}
```

## Autres endpoints

### Lister les gestionnaires d'une école

**Endpoint:** `GET /api/users/canteen-managers/school/:school_id`

**Authentification requise:** SCHOOL_ADMIN

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1k2l",
      "first_name": "Traoré",
      "last_name": "Moussa",
      "email": "moussa.traore@school.bf",
      "phone": "+22670333333",
      "role": "CANTEEN_MANAGER",
      "school_id": "64f1a2b3c4d5e6f7g8h9i0j1k2l",
      "is_temporary_password": false,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Réinitialiser le mot de passe d'un gestionnaire

**Endpoint:** `POST /api/users/canteen-managers/:id/reset-password`

**Authentification requise:** SCHOOL_ADMIN

**Réponse:**
```json
{
  "success": true,
  "message": "Mot de passe réinitialisé avec succès.",
  "data": {
    "temporary_password": "NewTempPass2024!",
    "instructions": "Le gestionnaire devra changer ce mot de passe lors de sa prochaine connexion."
  }
}
```

### Supprimer un gestionnaire

**Endpoint:** `DELETE /api/users/canteen-managers/:id`

**Authentification requise:** SCHOOL_ADMIN

**Réponse:**
```json
{
  "success": true,
  "message": "Gestionnaire de cantine supprimé avec succès."
}
```

## Sécurité

1. **Génération de mot de passe:** Les mots de passe temporaires sont générés aléatoirement avec 12 caractères incluant majuscules, minuscules, chiffres et symboles.

2. **Hashage:** Tous les mots de passe sont hashés avec bcrypt (cost: 10).

3. **Contrôle d'accès:** Seuls les School Admin peuvent gérer les gestionnaires de leur école.

4. **Changement forcé:** Les gestionnaires avec mot de passe temporaire sont bloqués jusqu'au changement.

5. **Audit:** Toutes les actions sont tracées avec `created_by` et timestamps.

## Codes d'erreur

- `TEMPORARY_PASSWORD_REQUIRED`: L'utilisateur doit changer son mot de passe temporaire
- `403`: Accès non autorisé (l'école n'appartient pas à l'admin)
- `400`: Données invalides ou email déjà existant
- `404`: Utilisateur ou école non trouvé
- `500`: Erreur serveur interne

## Implémentation recommandée

### Frontend - Flow de création

1. **Formulaire de création:**
   - Prénom, Nom, Email, Téléphone
   - Sélection automatique de l'école de l'admin
   - Validation email et téléphone

2. **Affichage des identifiants:**
   - Modal avec le mot de passe temporaire
   - Bouton "Copier" pour faciliter le partage
   - Instructions de sécurité claires

3. **Notification:**
   - Option d'envoyer par SMS/Email (si configuré)
   - Confirmation de création

### Frontend - Flow de première connexion

1. **Détection:** Si `requires_password_change: true` dans la réponse de login
2. **Redirection:** Vers page de changement de mot de passe
3. **Formulaire:** Mot de passe actuel, nouveau, confirmation
4. **Validation:** Force des critères de sécurité
5. **Success:** Redirection vers le dashboard normal

### Middleware recommandé

Appliquer le middleware `requirePasswordChange` sur toutes les routes protégées pour bloquer les utilisateurs avec mot de passe temporaire.
