## Elman Crochet Sales, Inventory, CRM, Expenses

### Local setup (PostgreSQL)

1) Start PostgreSQL (recommended via Docker):

```bash
docker compose up -d
```

2) Create `api/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/elman
NODE_ENV=development
```

3) Install and init DB:

```bash
npm install
npm run db:init
npm run db:seed
```

4) Run the app:

```bash
npm run start
```

Open: `http://localhost:5050`

### Render deployment

- Create Render PostgreSQL
- Set `DATABASE_URL` in the Web Service env vars
- Run one-time: `npm run db:init` (Render Shell)
- Optional: `npm run db:seed`