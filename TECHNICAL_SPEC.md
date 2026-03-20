Fixture Hub Technical Specification
1. Document purpose

This document describes the current technical architecture, runtime behavior, domain model, data persistence model, security posture, and implementation risks of the Fixture Hub application.

The specification is based on the current public repository state and reflects the implementation that exists in code today, not an aspirational future-state architecture. The repository is a Vite + React + TypeScript project with Supabase as the backend and includes src and supabase as the main product-bearing directories.

2. System overview

Fixture Hub is a single-page web application for tournament operations. The current product flow is: choose a sport, choose a tournament, select viewer or admin access, then work inside the tournament management workspace or view the live scoreboard. The sport selector currently enables netball and shows hockey as coming soon. The UI is branded as “Tournament Manager” and “Powered by StatEdge.”

The system supports tournament setup, team and player intake, pool management, fixture generation and scheduling, live score entry, standings calculation, playoff generation, PDF/CSV export, and a public-facing scoreboard. The main management screen is Index, while the public display layer is Scoreboard.

3. Technology stack

The frontend stack is Vite, React 18, TypeScript, React Router, TanStack React Query, Tailwind, shadcn/Radix UI, Lucide icons, Sonner toasts, and Supabase JavaScript client. The project also uses jspdf and jspdf-autotable for PDF generation and Vitest for testing. The Vite dev server is configured on port 8080, and the path alias @ resolves to ./src.

Application bootstrap is handled by main.tsx, which mounts the React app, and App.tsx, which wraps the app in QueryClientProvider, tooltip support, and toast providers before declaring routes. Supabase is initialized in src/lib/supabase.ts from VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.

4. Route architecture

The page layer is organized around a simple operational funnel.

SportSelector is the landing route and controls sport entry. TournamentSelector loads tournaments, supports create/edit/archive flows for admins, and exposes archived-vs-active filtering. AccessLevel branches users into viewer or admin paths. Index is the main tournament workspace. Scoreboard is the public live-display route. App.tsx imports all of these pages and wires them into the SPA route tree.

Viewer navigation is route-based and lightweight: the app navigates viewers to /:sport/tournament/:tournamentId/manage?role=viewer. Admin navigation similarly lands on the manage route with role=admin, but the actual admin state is later validated against Supabase profile data in the management screen bootstrap.

5. Runtime behavior

Index is the operational core. On bootstrap, it resolves the requested role, loads or creates the default tournament where allowed, fetches the current tournament aggregate from Supabase, and subscribes to authentication changes. When a tournament is active, it also subscribes to realtime updates so the UI can refresh when tournament records change.

The scoreboard follows a similar pattern. It calls ensureDefaultTournament(false), fetches the current tournament, subscribes to realtime updates, maintains a clock that updates every second, and renders upcoming matches, recent results, and pool standings. It shows the scoreboard as “Live from Supabase.”

The realtime integration is implemented through Supabase postgres_changes channels scoped to the tournament row and each child table: pools, teams, players, fixtures, and playoff_matches. The subscription layer returns a cleanup function that removes all channels on unmount.

6. Access control and authorization model

The application uses Supabase Auth for sign-in, sign-up, sign-out, and auth state changes. The profiles table holds user roles, and the app treats profiles.role === 'admin' as the gate for organizer-level behavior. getSessionProfile() resolves the current session and profile for use in page-level role decisions.

The database schema enables row-level security on profiles, tournaments, pools, teams, players, fixtures, and playoff_matches. Policies allow public reads of public tournaments and their child data, while write access is restricted to authenticated admins through the public.is_admin() function. Public read is also allowed on the tournament-assets storage bucket, while asset writes are admin-restricted.

There is, however, one serious security flaw in the client layer: FixtureManager contains a hard-coded client-side constant ADMIN_PASSWORD = 'admin' to reopen or edit closed rounds. This is not a real security control and should be removed. Round editing permissions must be enforced by authenticated backend rules, not by a frontend password embedded in shipped code.

7. Domain model

The in-memory model centers on a tournament aggregate. The default tournament includes an id, name, managerName, logo, teams, pools, fixtures, playoffs, players, tournament scoring values (pointsForWin, pointsForDraw, pointsForLoss), and a closedRounds map. The store also exposes helpers for closing and reopening rounds.

At the database level, public.tournaments is the root table. Child tables include pools, teams, players, fixtures, and playoff_matches. The tournament row also stores a much broader operational settings model than the in-memory default object suggests, including sport type, tournament format, season, status, date range, daily schedule, venue, court configuration, tiebreak rules, playoff qualification, scoring rules, invite code, theme color, sponsor names, host organization, contact details, registration settings, medical contact, rules and conduct fields, weather notes, announcements, and archived_at.

8. Persistence model

The persistence adapter lives in src/lib/tournament-api.ts. fetchTournament() loads the tournament row and all child rows in parallel, then maps them into the application aggregate. Fixtures are ordered by round and then by date when loaded. uploadTournamentLogo() writes to the public tournament-assets bucket and stores the bucket path on the tournament row.

saveTournamentState() upserts the root tournament row and then deletes and reinserts all child entities for that tournament: fixtures, playoff matches, players, teams, and pools. This makes the save path simple, but it also means the current persistence model is effectively snapshot replacement rather than granular incremental updates. That has consequences for concurrency, auditability, row identity stability, and partial-failure recovery.

ensureDefaultTournament() implements an implicit default-tournament strategy. It first looks up the earliest-created tournament. If none exists and creation is allowed, it inserts a starter tournament. This means the current “default tournament” concept is based on creation order rather than an explicit active/public/live marker.

9. Functional modules
9.1 Team management

TeamManager supports manual team creation, team removal, CSV template download, and CSV import using a FileReader. Imported teams increase the in-memory team list and can later be assigned to pools. The downloadable template name is team-template.csv.

9.2 Player management

PlayerManager supports player creation, deletion, team assignment, reassignment, filtering by team, CSV template download, and CSV import. It captures player name, jersey number, position, and optional team. The downloadable template name is player-template.csv.

9.3 Pool management

Pool membership is modeled through team-to-pool and pool-to-team relationships. Pools are visible and later used as the unit for fixture generation, standings calculation, and playoff qualification. Pool data is persisted in the pools table and linked to teams through pool_id.

9.4 Fixture management

FixtureManager is the most operationally important module. It supports round-robin generation across all pools, manual fixture creation, per-pool CSV export, schedule editing for date/time/venue, round close and reopen actions, score entry and score clearing, fixture template download, fixture CSV import, and tournament-wide PDF export. The downloadable template name is fixture-template.csv.

9.5 Standings

The standings view renders standings by pool and exposes the tie-break order in the UI as: Points, then Goal Difference, then Goals For, then alphabetical ordering. The scoreboard also renders standings blocks for each pool using calculated standings from the store layer.

9.6 Playoffs

PlayoffBracket generates knockout brackets from pool standings based on a configurable “top teams per pool” value, renders bracket rounds, and allows score entry and score reset. Playoff score entry explicitly disallows draws. Rounds are named dynamically, with examples including Final, Semi-Finals, and Quarter-Finals.

9.7 Match notifications

MatchNotifications scans scheduled but unplayed fixtures, computes time to kickoff, and raises in-app alerts at 10 minutes and 5 minutes before the match. The check runs every 30 seconds. Each notification includes the teams, venue, and time.

10. Current user-role behavior

In the management screen, admin users have access to teams, players, pools, fixtures, standings, and playoffs. Viewer users get a reduced, read-only experience focused on standings, fixtures, and playoffs. This split is implemented at the page level in Index using the resolved role state.

This design is appropriate for a tournament-operations product because it separates write-capable organizer workflows from audience-friendly consumption workflows without requiring a fully separate frontend application.

11. Data flow

A typical admin write flow works like this: a user action mutates the in-memory tournament object, persistTournament() in Index calls saveTournamentState(), the root tournament and child rows are written to Supabase, and realtime subscriptions trigger refreshes in other open clients such as the scoreboard. This architecture gives the product near-live synchronization without a separate websocket service.

A typical viewer flow is simpler: the user selects a tournament, enters viewer mode, and the UI reads the same underlying tournament state with read-only controls. The scoreboard route bypasses the management workspace and presents a live public view over the same tournament data.

12. Archive and lifecycle behavior

The database schema includes archived_at on the tournaments table. TournamentSelector visibly distinguishes active and archived tournament lists and exposes admin actions to archive or restore tournaments based on that field.

There is a lifecycle inconsistency in the management page. Index exposes an archive button, but its handleArchive() only confirms with the user, calls saveTournamentState(tournament), and shows a success toast. It does not set archived_at. As a result, the main workspace’s archive action does not align with the selector page’s archive model.

13. Type-safety and maintainability posture

The current TypeScript configuration is intentionally loose. strict is false, noImplicitAny is false, and noUnusedLocals is false. That improves speed for early-stage development, but it reduces static safety and increases the likelihood of runtime defects and inconsistent data handling.

The repository README remains the generic Lovable scaffold and GitHub shows no description, website, or topics for the project. That means engineering onboarding, product explanation, and stakeholder due diligence all currently depend on reading the code rather than the repo documentation.

14. Key technical risks

The highest-severity issue is the client-side admin password in FixtureManager. This should be removed immediately.

The second major issue is the destructive persistence strategy in saveTournamentState(). It should be replaced with granular upsert/update/delete behavior by entity type.

The third issue is implicit default-tournament selection. The product needs a first-class “active” or “public live” tournament concept instead of assuming the earliest-created tournament should be the one used by the scoreboard and bootstrap logic.

The fourth issue is lifecycle inconsistency around archiving. Active/archive state should be managed in one consistent way across all UI entry points.

15. Recommended technical roadmap

Immediate priority: remove the client-side password, review all admin mutation paths, and validate that Supabase RLS policies are the only enforcement mechanism for protected writes.

Next: refactor persistence to preserve stable child-row identity and avoid delete-and-reinsert saves. This will improve concurrency, auditability, and future integration readiness.

Then: add an explicit tournament lifecycle model with statuses such as draft, active, archived, and public-live, and make the scoreboard select by that model instead of creation order.

Finally: tighten TypeScript settings, document the Supabase schema and RLS model, and replace the generic README with repo-level engineering documentation.

16. Source map

Primary implementation references:

package.json

vite.config.ts

src/main.tsx

src/App.tsx

src/pages/SportSelector.tsx

src/pages/TournamentSelector.tsx

src/pages/AccessLevel.tsx

src/pages/Index.tsx

src/pages/Scoreboard.tsx

src/components/TeamManager.tsx

src/components/PlayerManager.tsx

src/components/FixtureManager.tsx

src/components/PlayoffBracket.tsx

src/components/MatchNotifications.tsx

src/components/TournamentFormDialog.tsx

src/components/StandingsView.tsx

src/lib/supabase.ts

src/lib/tournament-api.ts

src/lib/tournament-store.ts

supabase/schema.sql
