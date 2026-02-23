# Deploiement Docker (rapide)

Cette configuration lance 3 services:
- `mongo` (MongoDB)
- `backend` (Node.js, `start-backend.js`)
- `frontend` (Vite sur le port `3001`)

## 1) Prerequis
- Docker Desktop installe et demarre
- Le fichier `backend/.env` present (avec au minimum `JWT_SECRET`)

## 2) Lancer la stack
Depuis la racine du projet:

```bash
docker compose up -d --build
```

## 3) Verifier
- Frontend: `http://localhost:3001`
- Backend health: `http://localhost:5000/api/health`

## 4) Logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongo
```

## 5) Arreter
```bash
docker compose down
```

Pour supprimer aussi les donnees Mongo:

```bash
docker compose down -v
```

## Note importante
Cette stack est une voie de deploiement immediate basee sur les scripts existants.
Un packaging "production stricte" (build TypeScript + frontend statique Nginx) necessite d'abord de corriger les erreurs TypeScript actuellement presentes dans le repo.

