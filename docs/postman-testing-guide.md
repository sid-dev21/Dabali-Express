# Guide de Test API Dabali-Express avec Postman

## Configuration Initiale

### 1. Import de la Collection

1. Téléchargez et installez [Postman](https://www.postman.com/downloads/)
2. Créez une nouvelle collection nommée "Dabali-Express API"
3. Configurez les variables d'environnement :

#### Variables d'Environnement
```
Base URL: http://localhost:5000
API Key: (si nécessaire)
Token: (sera généré après login)
```

### 2. Configuration des Headers

Pour chaque requête, ajoutez ces headers :
- `Content-Type: application/json`
- `Accept: application/json`

---

## Authentification

### 1. Connexion (Login)
```
POST {{Base URL}}/api/auth/login
```

**Body (raw JSON):**
```json
{
    "email": "admin@dabali-express.com",
    "password": "Admin123!"
}
```

**Réponse attendue :**
```json
{
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": "698c76d9717b8b86c60cf51c",
        "email": "admin@dabali-express.com",
        "role": "SUPER_ADMIN",
        "first_name": "Super",
        "last_name": "Admin"
    }
}
```

**Actions Postman :**
1. Copiez le token reçu
2. Allez dans les variables d'environnement et collez-le dans la variable `Token`

### 2. Inscription (Register)
```
POST {{Base URL}}/api/auth/register
```

**Body (raw JSON):**
```json
{
    "email": "test@example.com",
    "password": "Test123456",
    "role": "PARENT",
    "first_name": "Test",
    "last_name": "User",
    "phone": "+22670000001"
}
```

### 3. Obtenir le Profil Utilisateur
```
GET {{Base URL}}/api/auth/current
```

**Headers :**
- `Authorization: Bearer {{Token}}`

### 4. Déconnexion
```
POST {{Base URL}}/api/auth/logout
```

**Headers :**
- `Authorization: Bearer {{Token}}`

---

## Écoles (Schools)

### 1. Créer une École
```
POST {{Base URL}}/api/schools
```

**Headers :**
- `Authorization: Bearer {{Token}}`

**Body (raw JSON):**
```json
{
    "name": "École Test Dabali",
    "address": "123 Rue Test, Ouagadougou",
    "phone": "+22650000000",
    "email": "ecole@test.com",
    "description": "École de test pour Dabali Express"
}
```

### 2. Lister toutes les Écoles
```
GET {{Base URL}}/api/schools
```

**Headers :**
- `Authorization: Bearer {{Token}}`

### 3. Obtenir une École par ID
```
GET {{Base URL}}/api/schools/{school_id}
```

**Headers :**
- `Authorization: Bearer {{Token}}`

### 4. Mettre à jour une École
```
PUT {{Base URL}}/api/schools/{school_id}
```

**Headers :**
- `Authorization: Bearer {{Token}}`

**Body (raw JSON):**
```json
{
    "name": "École Test Dabali - Updated",
    "address": "456 Nouvelle Rue, Ouagadougou"
}
```

### 5. Supprimer une École
```
DELETE {{Base URL}}/api/schools/{school_id}
```

**Headers :**
- `Authorization: Bearer {{Token}}`

---

## Étudiants (Students)

### 1. Créer un Étudiant
```
POST {{Base URL}}/api/students
```

**Headers :**
- `Authorization: Bearer {{Token}}`

**Body (raw JSON):**
```json
{
    "first_name": "Étudiant",
    "last_name": "Test",
    "birth_date": "2010-01-15",
    "grade": "CM2",
    "school_id": "school_id_here",
    "parent_id": "parent_id_here"
}
```

### 2. Lister tous les Étudiants
```
GET {{Base URL}}/api/students
```

**Headers :**
- `Authorization: Bearer {{Token}}`

### 3. Lister les Étudiants par École
```
GET {{Base URL}}/api/students/school/{school_id}
```

**Headers :**
- `Authorization: Bearer {{Token}}`

### 4. Mettre à jour un Étudiant
```
PUT {{Base URL}}/api/students/{student_id}
```

**Headers :**
- `Authorization: Bearer {{Token}}`

---

## Menus (Menus)

### 1. Créer un Menu
```
POST {{Base URL}}/api/menus
```

**Headers :**
- `Authorization: Bearer {{Token}}`

**Body (raw JSON):**
```json
{
    "name": "Menu Semaine 1",
    "description": "Menu équilibré pour la semaine",
    "price": 1500,
    "meals": [
        {
            "day": "Lundi",
            "breakfast": "Millet + Lait",
            "lunch": "Riz + Sauce",
            "snack": "Fruit"
        }
    ],
    "school_id": "school_id_here",
    "created_by": "user_id_here"
}
```

### 2. Lister tous les Menus
```
GET {{Base URL}}/api/menus
```

**Headers :**
- `Authorization: Bearer {{Token}}`

### 3. Lister les Menus par École
```
GET {{Base URL}}/api/menus/school/{school_id}
```

**Headers :**
- `Authorization: Bearer {{Token}}`

---

## Abonnements (Subscriptions)

### 1. Créer un Abonnement
```
POST {{Base URL}}/api/subscriptions
```

**Headers :**
- `Authorization: Bearer {{Token}}`

**Body (raw JSON):**
```json
{
    "student_id": "student_id_here",
    "menu_id": "menu_id_here",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "status": "ACTIVE",
    "total_amount": 180000
}
```

### 2. Lister tous les Abonnements
```
GET {{Base URL}}/api/subscriptions
```

**Headers :**
- `Authorization: Bearer {{Token}}`

### 3. Lister les Abonnements par Étudiant
```
GET {{Base URL}}/api/subscriptions/student/{student_id}
```

**Headers :**
- `Authorization: Bearer {{Token}}`

---

## Paiements (Payments)

### 1. Créer un Paiement
```
POST {{Base URL}}/api/payments
```

**Headers :**
- `Authorization: Bearer {{Token}}`

**Body (raw JSON):**
```json
{
    "subscription_id": "subscription_id_here",
    "parent_id": "parent_id_here",
    "amount": 15000,
    "payment_method": "MOBILE_MONEY",
    "payment_date": "2024-01-15",
    "status": "COMPLETED",
    "transaction_id": "TXN123456789"
}
```

### 2. Lister tous les Paiements
```
GET {{Base URL}}/api/payments
```

**Headers :**
- `Authorization: Bearer {{Token}}`

### 3. Lister les Paiements par Parent
```
GET {{Base URL}}/api/payments/parent/{parent_id}
```

**Headers :**
- `Authorization: Bearer {{Token}}`

---

## Présences (Attendance)

### 1. Marquer la Présence
```
POST {{Base URL}}/api/attendance
```

**Headers :**
- `Authorization: Bearer {{Token}}`

**Body (raw JSON):**
```json
{
    "student_id": "student_id_here",
    "date": "2024-01-15",
    "status": "PRESENT",
    "check_in_time": "07:30",
    "check_out_time": "12:30",
    "meal_consumed": true
}
```

### 2. Lister les Présences
```
GET {{Base URL}}/api/attendance
```

**Headers :**
- `Authorization: Bearer {{Token}}`

### 3. Lister les Présences par Étudiant
```
GET {{Base URL}}/api/attendance/student/{student_id}
```

**Headers :**
- `Authorization: Bearer {{Token}}`

---

## Rapports (Reports)

### 1. Obtenir les Statistiques Générales
```
GET {{Base URL}}/api/reports/stats
```

**Headers :**
- `Authorization: Bearer {{Token}}`

### 2. Rapport par École
```
GET {{Base URL}}/api/reports/school/{school_id}
```

**Headers :**
- `Authorization: Bearer {{Token}}`

### 3. Rapport Financier
```
GET {{Base URL}}/api/reports/financial?start_date=2024-01-01&end_date=2024-12-31
```

**Headers :**
- `Authorization: Bearer {{Token}}`

---

## Notifications

### 1. Envoyer une Notification
```
POST {{Base URL}}/api/notifications
```

**Headers :**
- `Authorization: Bearer {{Token}}`

**Body (raw JSON):**
```json
{
    "user_id": "user_id_here",
    "title": "Notification Test",
    "message": "Ceci est un message de test",
    "type": "INFO",
    "priority": "NORMAL"
}
```

### 2. Lister les Notifications
```
GET {{Base URL}}/api/notifications
```

**Headers :**
- `Authorization: Bearer {{Token}}`

### 3. Marquer comme Lu
```
PUT {{Base URL}}/api/notifications/{notification_id}/read
```

**Headers :**
- `Authorization: Bearer {{Token}}`

---

## Tests de Santé

### 1. Vérifier l'État de l'API
```
GET {{Base URL}}/api/health
```

**Réponse attendue :**
```json
{
    "success": true,
    "message": "API is running"
}
```

---

## Conseils pour les Tests

### 1. Gestion des Tokens
- Après chaque login, copiez le nouveau token
- Mettez à jour la variable `Token` dans Postman
- Le token expire après 7 jours

### 2. Tests d'Erreur
Testez ces scénarios :
- Token invalide ou manquant
- Données manquantes dans le body
- Formats de données incorrects
- IDs non valides

### 3. Workflow Complet
1. **Login** → Obtenir le token
2. **Créer une école** → Obtenir school_id
3. **Créer un étudiant** → Obtenir student_id
4. **Créer un menu** → Obtenir menu_id
5. **Créer un abonnement** → Obtenir subscription_id
6. **Créer un paiement**
7. **Marquer la présence**
8. **Générer des rapports**

### 4. Variables Dynamiques
Utilisez les variables Postman pour stocker :
- `{{school_id}}`
- `{{student_id}}`
- `{{menu_id}}`
- `{{subscription_id}}`

### 5. Tests Automatisés
Créez des scripts de test dans l'onglet "Tests" de Postman :
```javascript
// Test de base
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Test pour vérifier la présence de token
pm.test("Token is present", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.token).to.exist;
    
    // Sauvegarder le token
    pm.environment.set("Token", jsonData.token);
});
```

---

## Dépannage

### Problèmes Communs

1. **401 Unauthorized**
   - Vérifiez que le token est valide
   - Assurez-vous que le header Authorization est correct

2. **404 Not Found**
   - Vérifiez l'URL de base (port 5000)
   - Confirmez que le endpoint existe

3. **500 Internal Server Error**
   - Vérifiez les logs du serveur backend
   - Assurez-vous que MongoDB est en cours d'exécution

4. **CORS Errors**
   - Le backend est configuré pour accepter toutes les origines
   - Vérifiez que les headers sont corrects

### Logs du Serveur
Pour voir les erreurs détaillées :
```bash
cd backend
npm run dev
```

---

## Export de Collection

Pour partager cette collection :
1. Cliquez sur "..." à côté de la collection
2. Choisissez "Export"
3. Sélectionnez le format v2.1
4. Partagez le fichier JSON

Ce guide couvre tous les endpoints principaux de votre API Dabali-Express. Adaptez les IDs et données selon vos besoins spécifiques.
