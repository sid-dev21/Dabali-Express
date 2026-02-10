# 🔑 IDENTIFIANTS DE CONNEXION - DABALI EXPRESS

## Comptes disponibles dans la base de données :

### 🔧 SUPER ADMIN
- **Email** : `admin@dabali-express.com`
- **Mot de passe** : `Admin123!`
- **Rôle** : SUPER_ADMIN
- **Permissions** : Accès complet à tout le système

### 👨‍💼 SCHOOL ADMIN
- **Email** : `parent@example.com` (actuellement, mais peut être utilisé pour tester)
- **Mot de passe** : `Parent123!`
- **Rôle** : PARENT (mais vous pouvez tester avec ce compte)
- **Note** : Un vrai compte SCHOOL_ADMIN sera créé ci-dessous

### 👨‍🍳 CANTEEN MANAGER
- **Email** : À créer
- **Mot de passe** : À définir
- **Rôle** : CANTEEN_MANAGER

### 👨‍👩‍👧‍👦 PARENT
- **Email** : `parent@example.com`
- **Mot de passe** : `Parent123!`
- **Rôle** : PARENT
- **Enfants** : Amina Ouedraogo (CE2)

---

## 🚀 PROCÉDURE DE CONNEXION

1. **Démarrer le backend** :
   ```bash
   cd backend
   npm run dev
   ```

2. **Démarrer le frontend** :
   ```bash
   cd frontend_web
   npm run dev
   ```

3. **Se connecter** :
   - Aller sur http://localhost:5173
   - Utiliser les identifiants ci-dessus

---

## 🔧 POUR TESTER LES NOUVELLES FONCTIONNALITÉS

### 1. Workflow de validation des menus :
1. Se connecter comme **CANTEEN MANAGER** (créer d'abord ce compte)
2. Créer un menu (statut : PENDING)
3. Se connecter comme **SCHOOL ADMIN**
4. Approuver/rejeter le menu dans la nouvelle interface

### 2. Notifications parents :
1. Se connecter comme **PARENT**
2. Un autre utilisateur marque la présence de l'enfant
3. Le parent reçoit une notification automatique

---

## 🛠️ SI PROBLÈME DE CONNEXION

### Vérifier la base de données :
```bash
# Dans le dossier backend
psql -U postgres -d dabali_express
```

### Vérifier les utilisateurs :
```sql
SELECT email, role, first_name, last_name FROM users;
```

### Créer manuellement les comptes manquants :
```sql
-- School Admin
INSERT INTO users (email, password, role, first_name, last_name, phone) 
VALUES (
  'schooladmin@dabali-express.com', 
  '$2a$10$8K1p/a0dhrxiowP.dnkgNORTWgdEDHn5L2/xjpEWuC.QQv4rKO9jO', 
  'SCHOOL_ADMIN', 
  'Marie', 
  'SCHOOL_ADMIN', 
  '+22670000002'
);

-- Canteen Manager  
INSERT INTO users (email, password, role, first_name, last_name, phone) 
VALUES (
  'canteen@dabali-express.com', 
  '$2a$10$8K1p/a0dhrxiowP.dnkgNORTWgdEDHn5L2/xjpEWuC.QQv4rKO9jO', 
  'CANTEEN_MANAGER', 
  'Paul', 
  'CANTEEN_MANAGER', 
  '+22670000003'
);
```

---

## 📝 NOTES IMPORTANTES

- Le mot de passe `Admin123!` est hashé avec bcrypt
- Le frontend doit être configuré pour pointer sur `http://localhost:5000` pour l'API
- Assurez-vous que PostgreSQL est en cours d'exécution
- Les nouveaux rôles ont des permissions spécifiques implémentées
