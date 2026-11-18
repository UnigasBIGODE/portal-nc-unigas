# Portal de Não Conformidades — Unigás

Site do portal de controle de Não Conformidades (NCs) da Unigás – Sistemas de Aquecimento.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS, Recharts, TanStack Query/Table, Framer Motion.
- **Backend:** Google Apps Script publicado como Web App, com Google Sheets como banco de dados. O código do backend **não** fica neste repositório.
- **Publicação:** GitHub Pages, automática a cada push na branch `main` (`.github/workflows/deploy.yml`).

## Configuração

1. Em **Settings › Secrets and variables › Actions › Variables**, crie a variável `VITE_API_URL` com a URL do Web App do Apps Script (termina em `/exec`).
2. Em **Settings › Pages › Build and deployment › Source**, escolha **GitHub Actions**.
3. Para publicar de novo sem alterar o código: **Actions › Publicar no GitHub Pages › Run workflow**.

## Desenvolvimento local

```bash
npm install
echo "VITE_API_URL=https://script.google.com/macros/s/SEU_ID/exec" > .env.local
npm run dev
```

O acesso aos dados exige login. Cada usuário só recebe as NCs das áreas dele: o filtro é feito no servidor.
