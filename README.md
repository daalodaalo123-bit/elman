## Elman Crochet Sales, Inventory, CRM, Expenses

### Local setup (MongoDB + Auth)

1) Create `api/.env`:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=some_long_random_secret
BOOTSTRAP_SECRET=some_long_random_secret
NODE_ENV=development
```

2) Install deps:

```bash
npm install
```

3) Start dev servers:

```bash
npm run dev
```

4) Bootstrap the first owner user (one-time):

Send this request (replace values):

```bash
curl -X POST http://localhost:5050/api/auth/bootstrap ^
  -H "Content-Type: application/json" ^
  -H "x-bootstrap-secret: <BOOTSTRAP_SECRET>" ^
  -d "{\"username\":\"owner\",\"password\":\"ownerpass123\"}"
```

Then login at `http://localhost:5173/login`.

### (Old) Local setup (PostgreSQL)
This section is outdated; the current backend uses MongoDB.

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