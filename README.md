# The Recall

A React review site deployed as a Cloudflare Worker with a D1 database. Reviews are public; adding, editing, and deleting them requires the app's single editor account.

## Architecture

- Vite builds the React frontend into `dist/`.
- A Cloudflare Worker serves the frontend and the `/api` routes.
- D1 stores reviews, the editor credential, sessions, and login-attempt throttling.
- The existing YAML files are retained only as migration source data. Runtime reads and writes use D1.

## Local development

```bash
npm install
npm run db:setup
npm run db:seed
npx wrangler d1 execute recall --local --file=.wrangler/reviews-import.sql
npm run dev
```

Open <http://localhost:8787>. The first visit lets you create a local editor account. Public browsing does not require signing in.

If only the frontend is being worked on, `npm run dev:frontend` starts Vite, but API calls require the Worker dev server.

## Deploy to Cloudflare

### 1. Create D1

Sign Wrangler into the intended Cloudflare account and create the database:

```bash
npx wrangler login
npx wrangler d1 create recall
```

Copy the returned database ID into `wrangler.jsonc`, replacing `REPLACE_WITH_D1_DATABASE_ID`, then apply the schema:

```bash
npm run db:migrate
```

### 2. Import the repository reviews once

Generate a D1-compatible import from `content/reviews/*.yaml`:

```bash
npm run db:seed
npx wrangler d1 execute recall --remote --file=.wrangler/reviews-import.sql
```

The generated import replaces all rows in `reviews`. Run it only for the initial migration (or when replacing database review content is intentional). It does not alter users or sessions.

### 3. Protect first-account setup

The initial production account can only be created behind Cloudflare Access:

1. Deploy with `npm run deploy`.
2. In Cloudflare, protect the Worker's route with an Access policy restricted to your exact email address.
3. Copy the Access team domain and application Audience (`AUD`) into Worker secrets:

```bash
npx wrangler secret put TEAM_DOMAIN
npx wrangler secret put POLICY_AUD
npm run deploy
```

`TEAM_DOMAIN` is the full value such as `https://your-team.cloudflareaccess.com`, without a trailing slash.

Visit the protected app, click the sign-in icon, and create a username plus a password of at least 12 characters. The setup endpoint accepts exactly one account.

After the account exists, make the route public again. Visitors can browse reviews without authentication; the editor signs in to add, edit, or delete them.

### 4. Future updates

For code-only changes:

```bash
npm run deploy
```

When a new migration is added:

```bash
npm run db:migrate
npm run deploy
```

## Netlify custom hostname

`recall.royfox.co.uk` remains assigned to the existing Netlify site, which acts
as a transparent proxy to the Worker. The forced `200` rewrite in
`netlify.toml` sends pages, assets, and API calls to the Worker without changing
the address shown in the browser.

The Worker's `publicOrigin` constant permits authenticated same-origin writes
from that hostname. If the public hostname changes, update both settings and
redeploy the Worker and Netlify site.

## Security model

- There is exactly one editor account.
- Passwords are stored as salted PBKDF2-HMAC-SHA256 hashes (100,000 iterations), never as plaintext.
- Random session tokens live in `HttpOnly`, `Secure`, `SameSite=Strict` cookies; D1 stores only their SHA-256 hashes.
- Sessions expire after 30 days.
- Five failed attempts for the same username and IP trigger a 15-minute limit.
- All changing requests require both an authenticated session and a same-origin request.
- The one-time production setup endpoint validates a Cloudflare Access JWT.
