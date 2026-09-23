<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project notes

- Backend = Google Apps Script in `apps-script/src` (plain V8 JS, no modules, all files share one global scope). Google Sheets is the only database.
- Run `npm run test:backend` after any change in `apps-script/src`; it executes the real sources against mocks in `apps-script/tests`.
- The browser never calls Apps Script directly: use `src/lib/api.ts` (client) or `src/lib/server/data.ts` (server components).
- Never hard-code association content (events, prices, contact info…) in the frontend — it must come from the Settings / data sheets.
- Local demo: `npm run mock:api` + `npm run dev` (logins in README).
