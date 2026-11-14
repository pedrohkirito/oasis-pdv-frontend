# Oasis Frontend

Cliente web do PDV Oasis (React + Vite + TanStack Query).

## Desenvolvimento

Com o backend em `http://localhost:3001`:

```bash
cp .env.example .env
npm install
npm run dev
```

O proxy do Vite encaminha `/api` para o backend com cookies (`credentials: include`).