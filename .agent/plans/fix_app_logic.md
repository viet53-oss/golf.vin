# Fix App Logic Implementation Plan

## Objective
Identify and fix remaining `snake_case` usage in the codebase to align with the simplified `camelCase` Prisma schema.

## Remaining Areas to Check
1.  **Server Actions `app/actions.ts`**: This file is known to be broken and contains many `snake_case` queries.
2.  **Logic Pages**: Check `app/logic` for any data fetching.
3.  **Post Score**: `app/post-score` likely uses `RoundPlayer` and `Score` models.
4.  **Players**: `app/players` likely uses `Player` model and stats.
5.  **API Routes**: `app/api` routes might still be using old schema fields.
6.  **Global Search**: Perform a project-wide search for regex `_[a-z]` to find straggling `snake_case` properties.
    *   Keywords to look for: `gross_score`, `net_score`, `tee_box`, `hole_number`, `index_at`, `payout`, `in_pool`.

## Execution Steps
1.  **Fix `app/actions.ts`**: This is a high-impact file.
2.  **Scan `app/post-score/page.tsx`**: Ensure score posting works.
3.  **Scan `app/players/page.tsx`**: Ensure player list and details work.
4.  **Run "Global Search"**: Use `grep_search` to find `snake_case` usage in `.tsx` and `.ts` files.
5.  **Manual Verification**: Visit pages in the browser to confirm functionality.
