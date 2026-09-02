# Passport Photo Maker + Workers AI

## Files
- `src/worker.js` -> replace existing Worker source
- `wrangler.jsonc` -> replace existing Wrangler config (adds AI binding)
- `public/tools/passport-photo-test/index.html`
- `public/tools/passport-photo-test/app.js`
- `ai-passport-schema.sql` -> optional D1 migration; Worker auto-creates the tables too

## Deploy
1. Backup your current `src/worker.js` and `wrangler.jsonc`.
2. Copy this package's `worker.js` to `src/worker.js`.
3. Copy this package's `wrangler.jsonc` to the project root.
4. Copy the passport-photo-test folder into `public/tools/`.
5. Optional but recommended: run the schema remotely:
   `npx wrangler d1 execute free-pdf-forms-db --remote --file=./ai-passport-schema.sql`
6. Run:
   `npx wrangler deploy --dry-run`
7. If successful:
   `npx wrangler deploy`
8. Test:
   `/tools/passport-photo-test/`

## AI protection
- Maximum 5 AI requests per IP in the last 24 hours.
- The app reserves an estimated AI budget conservatively at 9,000 Neurons/day, below Cloudflare's 10,000 free-Neuron allocation.
- If the app-level daily guard is reached, AI tools are disabled until the next UTC day.
- If Cloudflare itself returns an AI quota/limit error, the UI also shows that AI is unavailable.
- Normal browser-only photo editing continues to work without AI.

## Important
The AI features require a Workers AI binding named `AI`.
