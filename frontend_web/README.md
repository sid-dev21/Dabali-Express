
# Dabali Express - Frontend Web 🇧🇫

Système de gestion de cantine scolaire optimisé pour les établissements du Burkina Faso.

## 🚀 Architecture
- **Framework**: React 19 (Functional Components / Hooks)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Data Management**: Service layer avec Mock API (préparé pour intégration REST)

## 📁 Structure du Projet
- `/components`: Composants UI modulaires
- `/services`: Logique de communication API
- `/utils`: Fonctions helpers (formatage monétaire, dates)
- `/types`: Définitions TypeScript globales

## 🛠 Installation & Dev
Une fois le backend prêt, changez la base URL dans `services/mockApi.ts`.

```bash
npm install
npm run dev
```

## 🔐 Sécurité
- Authentification par rôles (RBAC)
- Validation des mots de passe en front-end
- Gestion des sessions via localStorage (JWT ready)

---
*Développé pour l'écosystème éducatif Burkinabè.*
