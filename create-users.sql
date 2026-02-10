-- Création des utilisateurs manquants pour Dabali Express
-- Exécuter cette commande : psql -U postgres -d dabali_express -f create-users.sql

-- School Admin
INSERT INTO users (email, password, role, first_name, last_name, phone) 
VALUES (
  'schooladmin@dabali-express.com', 
  '$2a$10$8K1p/a0dhrxiowP.dnkgNORTWgdEDHn5L2/xjpEWuC.QQv4rKO9jO', 
  'SCHOOL_ADMIN', 
  'Marie', 
  'SCHOOL_ADMIN', 
  '+22670000002'
) ON CONFLICT (email) DO NOTHING;

-- Canteen Manager  
INSERT INTO users (email, password, role, first_name, last_name, phone) 
VALUES (
  'canteen@dabali-express.com', 
  '$2a$10$8K1p/a0dhrxiowP.dnkgNORTWgdEDHn5L2/xjpEWuC.QQv4rKO9jO', 
  'CANTEEN_MANAGER', 
  'Paul', 
  'CANTEEN_MANAGER', 
  '+22670000003'
) ON CONFLICT (email) DO NOTHING;

-- Mettre à jour l'admin_id de l'école
UPDATE schools 
SET admin_id = (SELECT id FROM users WHERE email = 'schooladmin@dabali-express.com')
WHERE name = 'École Primaire de Ouagadougou';

-- Afficher les utilisateurs créés
SELECT email, role, first_name, last_name, phone, created_at 
FROM users 
ORDER BY created_at;
