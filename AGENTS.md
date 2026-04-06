# Repository Guidelines

## Project Structure & Module Organization
This is a Next.js 14 App Router project. Route files live in `app/`, with the main UI under `app/[locale]/` and server actions in `app/actions.ts`. Reusable UI belongs in `components/`, shared types in `types/`, and helper code in `utils/` and `utils/supabase/`. Translation routing and message catalogs live in `i18n/` and `i18n/messages/`. Database SQL and schema changes belong in `supabase/` and `supabase/migrations/`. Long-form design or planning notes go in `docs/`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the local dev server at `http://localhost:3000`.
- `npm run build`: create the production build.
- `npm run start`: serve the production build locally.
- `npm run lint`: run Next.js lint checks.
- `npx tsc --noEmit`: run a TypeScript type check; use this before opening a PR because there is no dedicated script yet.

## Coding Style & Naming Conventions
Use TypeScript for app code and prefer functional React components. Follow the existing style: semicolons enabled, mostly single quotes, and 2-space indentation in configs or JSX-heavy files where that is already established. Use `PascalCase` for React components (`TemplateCard.tsx`), `camelCase` for functions and variables, and Next.js route file names such as `page.tsx`, `layout.tsx`, and `actions.ts`. Prefer the `@/` path alias over long relative imports. Keep Tailwind utility usage close to the component that owns the UI.

## Testing Guidelines
There is currently no committed automated test suite. For every change, run `npm run lint` and `npx tsc --noEmit`, then manually verify the affected flow in the browser. If you add tests, use `*.test.ts` or `*.test.tsx` naming and keep them near the feature they cover or in a nearby `__tests__/` directory.

## Commit & Pull Request Guidelines
Recent history favors short, imperative commit subjects, often with Conventional Commit prefixes such as `feat:`, `fix:`, or `refactor:`. Keep commits focused and reviewable. PRs should include a brief summary, linked issue or task when available, screenshots for UI changes, and notes for any new environment variables or Supabase migrations reviewers must apply.

## Security & Configuration Tips
Keep secrets in `.env.local` only. Never commit API keys or `SUPABASE_SERVICE_ROLE_KEY`. When changing schema or RPC behavior, include the matching SQL file under `supabase/migrations/` and document any required backfill or dashboard setup in the PR.
