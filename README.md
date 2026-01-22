## Elman Crochet Sales, Inventory, CRM, Expenses

### Local setup (MongoDB + Auth)

1) Create `api/.env`:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=some_long_random_secret
BOOTSTRAP_SECRET=some_long_random_secret
NODE_ENV=development

# Twilio SMS/WhatsApp (Optional - for customer notifications)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
# Set to 'true' to use WhatsApp instead of SMS (requires WhatsApp-enabled Twilio number)
TWILIO_USE_WHATSAPP=false
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

### If you forgot the password (already bootstrapped)

**Option 1: Using the helper script (recommended)**

Make sure the API server is running, then:

```bash
cd api
npm run reset-password owner newpassword123
```

**Option 2: Using curl**

Use the admin reset endpoint (protected by `BOOTSTRAP_SECRET`):

```bash
curl -X POST http://localhost:5050/api/auth/reset-password ^
  -H "Content-Type: application/json" ^
  -H "x-bootstrap-secret: <BOOTSTRAP_SECRET>" ^
  -d "{\"username\":\"owner\",\"new_password\":\"ownerpass123\"}"
```

**Note:** Make sure your `api/.env` file has the correct `BOOTSTRAP_SECRET` value.

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

This backend uses **MongoDB** (Atlas recommended).

- Create a Render **Web Service** for the `api` (or a single service that serves both API + built web).
- Set these env vars on the Render service:
  - `MONGODB_URI`: paste **only the URI value** (must start with `mongodb://` or `mongodb+srv://`)
  - `JWT_SECRET`
  - `BOOTSTRAP_SECRET`
  - `NODE_ENV=production`
  - `TWILIO_ACCOUNT_SID` (optional - for SMS/WhatsApp notifications)
  - `TWILIO_AUTH_TOKEN` (optional - for SMS/WhatsApp notifications)
  - `TWILIO_PHONE_NUMBER` (optional - for SMS/WhatsApp notifications, format: +1234567890)
  - `TWILIO_USE_WHATSAPP` (optional - set to 'true' to use WhatsApp instead of SMS)
- MongoDB Atlas:
  - Ensure the DB user/password in `MONGODB_URI` are correct
  - Ensure **Network Access** allows Render’s IPs (for quick testing you can allow `0.0.0.0/0`, then tighten later)

Bootstrap the first owner user once (use your Render service URL):

```bash
curl -X POST https://<your-service>.onrender.com/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-secret: <BOOTSTRAP_SECRET>" \
  -d "{\"username\":\"owner\",\"password\":\"ownerpass123\"}"
```

If production is already bootstrapped and you need to reset the password:

```bash
curl -X POST https://<your-service>.onrender.com/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-secret: <BOOTSTRAP_SECRET>" \
  -d "{\"username\":\"owner\",\"new_password\":\"ownerpass123\"}"
```

### Twilio SMS/WhatsApp Integration

The system can automatically send SMS or WhatsApp notifications to customers:

1. **Purchase Confirmations**: Automatically sent when a customer makes a purchase (if customer has phone number in CRM)

2. **Update Notifications**: Send custom messages to customers via API:
   ```bash
   curl -X POST http://localhost:5050/api/customers/notify \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <YOUR_TOKEN>" \
     -d '{
       "message": "New products available! Visit us today.",
       "send_to_all": true
     }'
   ```

   Or send to specific customers:
   ```bash
   curl -X POST http://localhost:5050/api/customers/notify \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <YOUR_TOKEN>" \
     -d '{
       "message": "Special discount just for you!",
       "customer_ids": ["customer_id_1", "customer_id_2"]
     }'
   ```

**Setup for SMS:**
1. Sign up for a Twilio account at https://www.twilio.com
2. Get your Account SID and Auth Token from the Twilio Console
3. Get a phone number from Twilio (or use your existing one)
4. Add the credentials to your `api/.env` file

**Setup for WhatsApp (via Twilio):**
1. Follow steps 1-2 above
2. Get a WhatsApp-enabled number from Twilio (requires approval)
3. Add credentials to `api/.env` and set `TWILIO_USE_WHATSAPP=true`
4. Note: WhatsApp via Twilio is not free (~$0.005 per message after free tier)

**Free WhatsApp Alternatives:**
Unfortunately, there are no reliable **free** options for sending WhatsApp messages programmatically:
- WhatsApp Web automation violates WhatsApp's Terms of Service and can get accounts banned
- Twilio WhatsApp API is the legitimate way but requires payment
- Other free APIs are unreliable and may violate ToS

**Note:** SMS/WhatsApp notifications are optional. If Twilio is not configured, the system will continue to work normally without sending messages.