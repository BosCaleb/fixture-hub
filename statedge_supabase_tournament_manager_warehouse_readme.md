
# StatEdge Tournament Manager Warehouse
## Adapted to your actual Supabase schema

## What I found in your schema
Your uploaded metadata shows these core `public` tables:
- `tournaments`
- `pools`
- `teams`
- `players`
- `fixtures`
- `playoff_matches`
- `profiles`

Important structural implications:
- IDs for tournament objects are mostly **text**, not UUID
- `profiles.id` is UUID and links to auth identity
- `tournaments.created_by` is UUID and is the main ownership field
- There is **no tenant / school / organisation table** yet
- `fixtures.date` and `fixtures.time` are stored as **text**
- Playoffs are in a **separate table**, which is good and should stay separate in the warehouse
- Only `tournaments` has `updated_at`; most child tables only have `created_at`

## Recommended warehouse architecture
Keep the warehouse inside the same Supabase Postgres project.

### Schemas
- `public` = app / OLTP source
- `auth` = user account source
- `analytics` = warehouse / reporting layer

### Why this is the best fit
This product is still relatively small and operationally centred around live tournament management. A separate external warehouse would add complexity before the data model needs it. Your current schema is well suited to a Postgres mart approach because:
- the facts are modest in size
- most reporting is tournament, pool, team, fixture, and standings based
- same-database refresh keeps dashboards near-real-time
- there is not yet a true multi-tenant organisational model

## Warehouse model
### Dimensions
- `dim_user_account`
- `dim_tournament`
- `dim_pool`
- `dim_team`
- `dim_player`
- `dim_date`

### Facts
- `fact_pool_fixture`
- `fact_playoff_match`
- `fact_team_match`

### Serving layer
- `v_match_schedule_unified`
- `mv_pool_standings_current`
- `mv_tournament_summary`
- `mv_team_performance_all_matches`

## Grain choices
### `fact_pool_fixture`
One row per pool-stage fixture

### `fact_playoff_match`
One row per playoff/bracket match

### `fact_team_match`
One row per team per match  
This is the most useful analytics fact because it supports:
- standings
- team form
- goals for / against
- wins / draws / losses
- pool-only vs all-match analysis

## Standings logic
Pool standings are calculated from:
- `tournaments.points_for_win`
- `tournaments.points_for_draw`
- `tournaments.points_for_loss`

Ranking order in the materialized view is:
1. points
2. goal difference
3. goals for
4. team name

Your `tournaments.tiebreak_rules` JSON is preserved in the warehouse, but not dynamically executed yet. That should come later if you want tournament-specific ranking logic to be fully dynamic.

## Why I chose full refresh
The safest first version is a full warehouse refresh because:
- child tables do not consistently have `updated_at`
- deletes would otherwise be hard to detect
- your current dataset size should make full refresh cheap and simple

Later, when volume grows, you can add:
- change capture triggers
- warehouse watermark tables
- or logical replication into ClickHouse / BigQuery / Snowflake

## Biggest schema limitations to fix next in the app
If you want a stronger future warehouse, these are the most important app-model improvements:

### 1) Add a real tenant / school / organisation model
Right now the app is tournament-centric and owner-centric. Add:
- `tenants`
- `tenant_users`
- `tournament_tenants` or `tournaments.tenant_id`

### 2) Change text business IDs to UUIDs for new entities
Your text IDs work, but UUIDs are cleaner for integrity and replication.

### 3) Store fixture schedule as typed values
Replace:
- `fixtures.date text`
- `fixtures.time text`

with something like:
- `scheduled_at timestamptz`
or at least:
- `match_date date`
- `match_time time`

### 4) Add `updated_at` to child tables
Add it to:
- `pools`
- `teams`
- `players`
- `fixtures`
- `playoff_matches`

### 5) Add event-level scoring if you want richer analytics
A future `score_events` or `match_events` table would unlock:
- scoring runs
- quarter analysis
- player contribution
- momentum charts

## Deployment order
1. Run the SQL in a dev/staging Supabase project
2. Validate the `stg_*` views
3. Run:
   - `select analytics.refresh_tournament_manager_warehouse();`
4. Refresh the materialized views
5. Compare the standings against the app
6. Enable the cron refresh

## Files created
- SQL bootstrap / refresh script
- this architecture note
