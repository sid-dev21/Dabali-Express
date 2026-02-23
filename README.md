# Dabali Express

Plateforme de gestion de cantine scolaire avec :
- un backend API (`backend`) en Node.js + TypeScript + MongoDB
- un frontend web d'administration (`frontend_web`) en React + Vite
- une application mobile parent (`frontend_mobile`) en Flutter

## Table des matieres

- [Apercu](#apercu)
- [Architecture](#architecture)
- [Fonctionnalites](#fonctionnalites)
- [Prerequis](#prerequis)
- [Installation locale](#installation-locale)
- [Configuration des environnements](#configuration-des-environnements)
- [Execution avec Docker](#execution-avec-docker)
- [Tests](#tests)
- [Documentation existante](#documentation-existante)
- [Arborescence](#arborescence)
- [Contribution](#contribution)
- [Licence](#licence)

## Apercu

L'application permet de gerer les ecoles, eleves, abonnements, paiements, menus, presences et rapports, avec authentification par roles (ex: `SUPER_ADMIN`, `SCHOOL_ADMIN`, `CANTEEN_MANAGER`, `PARENT`).

## Architecture

- API backend: `Express` + `Mongoose` + `JWT`
- Frontend web: `React`, `TypeScript`, `Vite`, `Tailwind CSS`
- Frontend mobile: `Flutter`
- Base de donnees: `MongoDB`

## Fonctionnalites

- Authentification et autorisation par roles
- Gestion des ecoles et utilisateurs
- Gestion des eleves et abonnements
- Gestion des paiements (avec preparation Orange Money / Moov Money)
- Gestion des menus et de la presence
- Rapports et notifications

## Prerequis

- Node.js 18+
- npm
- MongoDB (local ou Docker)
- Flutter SDK (uniquement pour `frontend_mobile`)
- Docker Desktop (optionnel)

## Installation locale

1. Cloner le projet:

```bash
git clone https://github.com/sid-dev21/Dabali-Express.git
cd Dabali-Express
```

2. Installer les dependances:

```bash
cd backend
npm install
cd ../frontend_web
npm install
cd ../frontend_mobile
flutter pub get
```

3. Lancer backend + frontend web (2 terminaux):

Terminal 1:
```bash
cd backend
npm run dev
```

Terminal 2:
```bash
cd frontend_web
npm run dev
```

Acces local par defaut:
- API: `http://localhost:5000/api`
- Healthcheck: `http://localhost:5000/api/health`
- Front web (Vite): `http://localhost:5173`

## Configuration des environnements

### Backend (`backend/.env`)

Un fichier est deja present. Valeurs principales:

```env
MONGODB_URI=mongodb://localhost:27017/dabali-express
JWT_SECRET=change_me
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12
```

Variables optionnelles (paiement mobile):
- `API_URL`
- `ORANGE_MONEY_BASE_URL`
- `ORANGE_MONEY_MERCHANT_KEY`
- `ORANGE_MONEY_API_KEY`
- `ORANGE_MONEY_RETURN_URL`
- `ORANGE_MONEY_CANCEL_URL`
- `MOOV_MONEY_BASE_URL`
- `MOOV_MONEY_MERCHANT_ID`
- `MOOV_MONEY_API_KEY`
- `MOOV_MONEY_SECRET_KEY`

Pour les tests, voir aussi `backend/.env.test` (`MONGODB_TEST_URI`, etc.).

### Frontend web (`frontend_web`)

Variable possible:

```env
VITE_API_URL=http://localhost:5000/api
```

Si absente, le code utilise deja `http://localhost:5000/api` par defaut.

### Frontend mobile (`frontend_mobile`)

L'URL API se passe via `dart-define`:

```bash
flutter run --dart-define=API_BASE_URL=http://localhost:5000/api
```

Exemple Android emulator:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api
```

## Execution avec Docker

Une stack Docker est deja prete (`mongo`, `backend`, `frontend`):

```bash
docker compose up -d --build
```

Acces:
- Frontend Docker: `http://localhost:3001`
- Backend Docker: `http://localhost:5000/api`

Arret:

```bash
docker compose down
```

Suppression des volumes Mongo:

```bash
docker compose down -v
```

Voir aussi `DEPLOY_DOCKER.md`.

## Tests

Depuis `backend`:

```bash
npm test
```

Autres commandes utiles:
- `npm run test:watch`
- `npm run test:coverage`

## Documentation existante

- `docs/api-endpoints.md`
- `docs/canteen-manager-api.md`
- `docs/postman-testing-guide.md`
- `docs/functional-testing-guide.md`
- `docs/development-plan.md`
- `DEPLOY_DOCKER.md`

## Arborescence

```text
.
|- backend/
|- frontend_web/
|- frontend_mobile/
|- docs/
|- docker-compose.yml
`- README.md
```

## Contribution

1. Creer une branche (`feature/nom-feature` ou `fix/nom-fix`)
2. Faire des commits clairs et atomiques
3. Ouvrir une Pull Request avec description et tests effectues

## Licence

Projet sous licence `ISC` (voir `package.json` racine).
