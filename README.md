# Oasis Frontend

Cliente web do PDV Oasis (React + Vite + TanStack Query).

## Desenvolvimento

```bash
cp .env.example .env
npm install
npm run dev
```

`VITE_API_URL` é a origem do backend, sem barra no final. Em desenvolvimento: `http://localhost:3001`. Em produção, a URL HTTPS da API. O navegador envia o cookie de sessão com `credentials: include`, então `CORS_ORIGIN` no backend tem de ser exatamente a origem do front.