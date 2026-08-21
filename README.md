# Forge

Chat karke app banao — live preview browser mein hi ban jati hai (Sandpack se), bilkul Claude ke "artifact" feature jaisa. Backend generate + self-review dono karta hai before response bhejne ke.

## Kaise kaam karta hai

1. Tu chat box mein likhta hai kya banana hai.
2. `/api/generate` route tere chune hue model (Claude / GPT / DeepSeek) ko bhejta hai, JSON mein React files maangta hai.
3. Wahi route ek **doosri call** karta hai isi model ko — "apna code review karo, bugs check karo" — aur agar kuch galat mila to fix karke bhejta hai.
4. Frontend un files ko Sandpack mein load karta hai — turant live preview, code tab, aur console dikhta hai.
5. Chahe to "Save" dabao — Supabase mein project save ho jata hai, baad me load kar sakte ho.

## Local mein chalana

```bash
npm install
cp .env.example .env.local
# .env.local mein kam se kam ek provider ki API key daalo (e.g. ANTHROPIC_API_KEY)
npm run dev
```

`http://localhost:3000` khol lo.

## Deploy — GitHub → Vercel

1. Is folder ko GitHub repo mein push karo:
   ```bash
   git init
   git add .
   git commit -m "forge: initial build"
   git branch -M main
   git remote add origin <teri-repo-url>
   git push -u origin main
   ```
2. [vercel.com](https://vercel.com) pe jao → "New Project" → apna GitHub repo select karo → Import.
3. Deploy se pehle **Environment Variables** section mein `.env.example` wale saare keys daal do (jo bhi provider use karna hai uski API key zaroor daalo).
4. Deploy dabao. 2 minute mein live URL mil jayega (`your-app.vercel.app`).

## Supabase jodna (optional — Save/Load ke liye)

1. [supabase.com](https://supabase.com) pe naya project banao.
2. SQL Editor mein `supabase/schema.sql` ka content run karo.
3. Project Settings → API se teen cheeze copy karo:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**ise kabhi client-side expose mat karna** — sirf Vercel env var mein daalo, ye sirf server routes use karte hain)
4. Vercel env vars mein ye teeno daal ke redeploy karo.

## Multiple models — better results ke liye

Header mein Claude / GPT / DeepSeek ke beech switch kar sakta hai — jis provider ki key `.env` mein hai wahi kaam karega. Aage badhane ke ideas:

- **Router**: chhote/simple requests DeepSeek (sasta) ko bhejo, complex/multi-file requests Claude ko.
- **Consensus mode**: same prompt do models ko bhejo, dono outputs compare karke better wala (ya combine karke) dikhao — `lib/llm.js` mein `callModel` already provider-agnostic hai, isi ke upar loop laga sakta hai.
- **Second-opinion review**: abhi self-review usi model se hoti hai jo code likhta hai — chaho to review step ke liye alag (doosra) model use karo taki blind spots kam hon.

## Structure

```
app/
  api/generate/route.js   — code generation + self-review
  api/projects/route.js   — save/load via Supabase
  page.js, layout.js
components/
  BuildConsole.jsx        — chat + orchestration
  PreviewPanel.jsx        — Sandpack live preview
lib/
  llm.js                  — provider-agnostic model calls
  supabaseClient.js
  starterFiles.js
supabase/schema.sql
```
