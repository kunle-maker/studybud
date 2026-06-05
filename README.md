# StudyBud — AI Study Assistant

React + Vite frontend. Connects to your existing MongoDB backend via axios.

## Setup

### 1. Point it at your backend

Open `src/lib/api.ts` and replace the URL with your backend:

```ts
const BASE_URL = "https://your-backend.com/api/v1";
```

### 2. Install & run locally

```bash
npm install
npm run dev
```

App runs at http://localhost:5173

### 3. Build for production

```bash
npm run build
```

Output goes to the `dist/` folder.

---

## Deploy on Render (Static Site)

1. Push this folder to a GitHub repo
2. On Render → **New → Static Site**
3. Set:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Add a **Rewrite Rule:** `/*` → `/index.html` (required for page routing)
5. Done

---

## Project Structure

```
studybud/
├── src/
│   ├── pages/        # Dashboard, Login, OCR, Quiz, Summaries, etc.
│   ├── components/   # Layout, UsageBar, all shadcn/ui components
│   └── lib/
│       ├── api.ts    # ← update your backend URL here
│       ├── auth.tsx  # JWT auth context
│       └── theme.tsx # Dark/light mode
├── public/           # Icons, favicon, robots.txt
├── index.html
├── vite.config.ts
└── package.json
```
