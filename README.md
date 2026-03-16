# GovScan — Frontend

Dashboard React para visualização dos Diários Oficiais indexados.

## Stack
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Recharts (gráficos)
- React Router DOM

## Desenvolvimento local

```bash
cp .env.example .env
npm install
npm run dev
```

Acesse: http://localhost:3000

## Variáveis de ambiente

| Variável       | Descrição                          | Padrão                  |
|----------------|------------------------------------|-------------------------|
| VITE_API_URL   | URL base da API backend            | http://localhost:8000   |

## Via Docker (ambiente separado)

```bash
docker build -t govscan-frontend .
docker run -p 3000:3000 -e VITE_API_URL=http://seu-backend:8000 govscan-frontend
```
