# CI-node-demo

Контейнеризований Node.js-застосунок із підключенням до PostgreSQL та автоматизованим CI/CD через GitHub Actions, Docker Hub і Docker Compose.

## Структура проєкту

- `index.js` - HTTP-сервер на порту `3000` (`/` та `/health`) із підключенням до PostgreSQL через `pg`.
- `package.json` - конфігурація проєкту, залежність `pg` та скрипти `start` / `build`.
- `Dockerfile` - збірка образу на базі офіційного `node:lts` з кешуванням шарів `package*.json`, встановленням залежностей (`npm install`) та `EXPOSE 3000`.
- `.dockerignore` - виключення `node_modules`, `.env`, `.git`, артефактів і ключів з контексту збірки.
- `docker-compose.yml` - запуск сервісу `app` (Node.js) та `db` (`postgres:15`) з `depends_on` (healthcheck), пробросом портів, volume `pgdata` і змінною тегу `IMAGE_TAG`.
- `.github/workflows/ci.yml` - CI/CD пайплайн: білд/перевірка, публікація Docker-образу в Docker Hub (теги гілки та короткого хешу коміту), видалення `pm2`, встановлення Docker на сервері та деплой через `docker compose`.

## Локальна збірка та запуск

### Збірка Docker-образу з тегом короткого хешу коміту

```bash
docker build -t DevOpsPractice5/nodeapp:$(git rev-parse --short HEAD) .
```

### Запуск через Docker Compose (Node.js + PostgreSQL)

```bash
docker compose up --build -d
docker compose logs -f
curl http://localhost:3000
curl http://localhost:3000/health
```

Зупинка сервісів:

```bash
docker compose down
```

## Налаштування GitHub Secrets для CI/CD

У **Settings → Secrets and variables → Actions** репозиторію мають бути додані секрети:

- `DOCKERHUB_USERNAME` - логін акаунту Docker Hub
- `DOCKERHUB_TOKEN` - Personal Access Token (Read & Write) для Docker Hub
- `EC2_HOST` - публічна IP-адреса сервера
- `EC2_USER` - ім'я користувача SSH
- `EC2_SSH_KEY_B64` - приватний SSH-ключ у base64 (в один рядок)