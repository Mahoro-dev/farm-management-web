# Farm desk

React client for the Farm Management API. It covers setup and sign-in, farms and people, the herd, milk, clinic, medicine stock, breeding, reports, and the audit log. Amounts are shown in Rwandan francs.

## Run

Start the API on port 8080, then:

```bash
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to http://localhost:8080.

On a new database, use **Set up the organization** on the sign-in page. That calls `POST /api/auth/bootstrap` once. After that, sign in with the administrator account.

To point a production build at another API origin, set `VITE_API_BASE` before `npm run build`. See `.env.example`.
