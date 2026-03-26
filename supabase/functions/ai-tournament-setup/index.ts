import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ─── validation helpers ─── */

function validateConfig(cfg: Record<string, unknown>): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Date logic
  if (cfg.start_date && cfg.end_date) {
    if (new Date(cfg.end_date as string) < new Date(cfg.start_date as string)) {
      errors.push("end_date is before start_date.");
    }
  }

  // Pool math
  const pools = cfg.number_of_pools as number | undefined;
  const tpp = cfg.teams_per_pool as number | undefined;
  const totalTeams = cfg.number_of_teams as number | undefined;
  if (pools && tpp && totalTeams) {
    const expected = pools * tpp;
    if (expected !== totalTeams) {
      errors.push(
        `Pool structure conflict: ${pools} pools × ${tpp} teams = ${expected}, but total teams is ${totalTeams}.`
      );
    }
  }

  // Points shouldn't be negative
  for (const k of ["points_for_win", "points_for_draw", "points_for_loss"]) {
    const v = cfg[k];
    if (typeof v === "number" && v < 0) {
      warnings.push(`${k} is negative (${v}). This is unusual.`);
    }
  }

  // Tiebreak duplicates
  const tb = cfg.standings_tiebreak_order;
  if (Array.isArray(tb)) {
    const set = new Set(tb);
    if (set.size < tb.length) {
      errors.push("Tiebreak order contains duplicates.");
    }
  }

  // Team names vs count
  const teamNames = cfg.team_names;
  if (Array.isArray(teamNames) && totalTeams && teamNames.length !== totalTeams) {
    warnings.push(
      `${teamNames.length} team names provided but number_of_teams is ${totalTeams}. Using name count.`
    );
  }

  // Scheduling feasibility
  if (totalTeams && typeof cfg.court_count === "number" && cfg.start_date && cfg.end_date) {
    const days =
      Math.ceil(
        (new Date(cfg.end_date as string).getTime() - new Date(cfg.start_date as string).getTime()) /
          86400000
      ) + 1;
    const courts = cfg.court_count as number;
    const dur = (cfg.match_duration_minutes as number) || 30;
    const slotsPerDay = Math.floor((8 * 60) / dur); // assume 8h
    const totalSlots = slotsPerDay * courts * days;
    const totalMatches = totalTeams * ((totalTeams - 1) / 2); // rough upper bound
    if (totalMatches > totalSlots) {
      warnings.push(
        `${totalTeams} teams may need ~${Math.ceil(totalMatches)} matches but only ~${totalSlots} slots available (${courts} courts × ${days} days). Consider adding courts or days.`
      );
    }
  }

  return { errors, warnings };
}

const SYSTEM_PROMPT = `You are a structured tournament setup parser for school sports tournaments. Your job is to extract precise structured data from a user's natural language description of a tournament.

RULES:
- Return ONLY a valid JSON object. No markdown, no extra text.
- Never invent tenant identity or auth data.
- Mark uncertain fields as missing or low confidence.
- Ask follow-up questions rather than hallucinating values.
- Use sport-aware defaults where appropriate.
- Preserve the user's exact rules where explicitly stated.
- Prefer precision over verbosity.

SPORT-AWARE DEFAULTS:
- For netball: 3 points for a win, 1 for a draw, 0 for a loss. Tiebreaks: points → goal difference → goals for → head-to-head.
- If format says "N pools of M", infer total teams = N × M unless a conflicting count is explicitly stated.
- If team count and pool structure conflict, flag the conflict.
- If "top X from each pool plus best Y thirds" is mentioned, compute total qualifiers.
- If playoff language implies quarterfinals/semifinals/final, normalize into structured playoff object.

OUTPUT JSON SCHEMA:
{
  "summary": "Short plain-language summary of the tournament setup",
  "fields": {
    "<field_name>": { "value": <extracted_value>, "source": "user|ai|default", "confidence": 0.0-1.0 }
  },
  "missing_required_fields": ["field1", "field2"],
  "conflicting_fields": [
    { "field": "field_name", "issue": "description of conflict" }
  ],
  "follow_up_questions": [
    { "id": "q1", "field": "field_name", "question": "Concise question text" }
  ],
  "assumptions": ["assumption1", "assumption2"],
  "warnings": ["warning1", "warning2"],
  "normalized_config": { ...final structured config... }
}

FIELD NAMES TO EXTRACT (use these exact keys in "fields" and "normalized_config"):
tournament_name, sport, tournament_level, age_group, gender_division, season_year, description,
start_date, end_date, daily_start_time, daily_end_time, timezone, match_duration_minutes,
venue_name, venue_address, court_count, court_names,
format_type, number_of_teams, team_names, number_of_pools, teams_per_pool, seeding_method,
halves_or_quarters, halftime_duration_minutes, break_between_matches_minutes,
allow_draws_in_pool_stage, allow_draws_in_knockout,
points_for_win, points_for_draw, points_for_loss,
standings_tiebreak_order, teams_qualifying_per_pool, wildcard_rules,
playoff_brackets, playoff_format_description,
registration_open, registration_deadline, entry_fee, max_teams_registration,
medical_contact, host_org, contact_person

REQUIRED FIELDS (must be present or flagged as missing):
tournament_name, sport, start_date, end_date, format_type, number_of_teams (or team_names), points_for_win, standings_tiebreak_order

If pool play is used: number_of_pools must be known or suggested.
If playoffs are used: playoff format must be defined at least at high level.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startMs = Date.now();

  try {
    const { user_prompt, structured_hints, follow_up_answers } = await req.json();

    if (!user_prompt || typeof user_prompt !== "string" || user_prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "user_prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build user message with optional hints and follow-up answers
    let userMessage = `Tournament description:\n${user_prompt.trim()}`;

    if (structured_hints && typeof structured_hints === "object") {
      const hints = Object.entries(structured_hints)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      if (hints) {
        userMessage += `\n\nAdditional structured hints:\n${hints}`;
      }
    }

    if (follow_up_answers && typeof follow_up_answers === "object") {
      const answers = Object.entries(follow_up_answers)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => `Answer to "${k}": ${v}`)
        .join("\n");
      if (answers) {
        userMessage += `\n\nFollow-up answers provided:\n${answers}`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    let content = aiResult.choices?.[0]?.message?.content ?? "";

    // Strip markdown code fences if present
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("AI returned invalid JSON:", content.substring(0, 500));
      return new Response(
        JSON.stringify({
          error: "AI returned an invalid response. Please try again.",
          raw_content: content.substring(0, 200),
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Run deterministic validation on normalized_config
    const normalizedConfig = (parsed.normalized_config as Record<string, unknown>) || {};
    const { errors: validationErrors, warnings: validationWarnings } = validateConfig(normalizedConfig);

    // Merge validation results into the AI response
    const existingWarnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];
    const existingConflicts = Array.isArray(parsed.conflicting_fields) ? parsed.conflicting_fields : [];

    parsed.warnings = [...existingWarnings, ...validationWarnings];
    parsed.conflicting_fields = [
      ...existingConflicts,
      ...validationErrors.map((e) => ({ field: "validation", issue: e })),
    ];

    const durationMs = Date.now() - startMs;

    return new Response(
      JSON.stringify({
        ...parsed,
        _meta: {
          model: "google/gemini-2.5-flash",
          duration_ms: durationMs,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-tournament-setup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
