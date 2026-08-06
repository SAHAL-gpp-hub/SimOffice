-- ============================================================================
-- SimOffice — Database Schema (Pilot Edition)
-- Target: PostgreSQL 17.x
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS citext;  -- only extension needed, for case-insensitive email
-- gen_random_uuid() is built into Postgres core since v13 — no extension needed for it.

-- ----------------------------------------------------------------------------
-- 1. DEPARTMENTS (reference/lookup table)
-- ----------------------------------------------------------------------------
CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,          -- 'frontend' | 'backend' | 'devops' | 'qa'
    display_name    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE departments IS
  'Fixed dictionary of the four disciplines (PRD §10.1). Phase 0 seeds/uses backend only; rows for the other three exist from day one so Phase 1 needs zero schema change (PRD §5.3).';

-- ----------------------------------------------------------------------------
-- 2. ACCOUNTS (teachers only, at pilot scale)
-- ----------------------------------------------------------------------------
CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role            TEXT NOT NULL DEFAULT 'teacher'
                        CHECK (role IN ('teacher', 'admin')),
    email           CITEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deactivated_at  TIMESTAMPTZ NULL
);

COMMENT ON TABLE accounts IS
  'Real, credentialed identity. PRD §15.1/§16.6: only teachers get one in the pilot — students use roster_entries (no login), content authors/admins are not modeled as accounts at pilot scale (PRD §11.5.5 — content pipeline is git/manifest-based, not an in-app role). deactivated_at implements PRD §11.1 deprovisioning without deleting a teacher''s historical classes/sessions.';

-- ----------------------------------------------------------------------------
-- 3. CLASSES (persistent class/section, PRD §15.2)
-- ----------------------------------------------------------------------------
CREATE TABLE classes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    name                TEXT NOT NULL,
    term_label          TEXT NULL,                  -- e.g. 'Fall 2026' — supports PRD §12.4/§17 reuse-across-terms
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at         TIMESTAMPTZ NULL
);

CREATE INDEX idx_classes_teacher_account_id ON classes(teacher_account_id);

COMMENT ON TABLE classes IS
  'PRD §15.2: a class is first-class and persists across a term; a teacher owns one or more; a session always belongs to exactly one class. archived_at supports the §11.1 teacher-deprovisioning case without deleting rows.';

-- ----------------------------------------------------------------------------
-- 4. ROSTER_ENTRIES (persistent, class-scoped student identity)
-- ----------------------------------------------------------------------------
CREATE TABLE roster_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id            UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    display_name        TEXT NOT NULL,
    roster_passcode_hash TEXT NOT NULL,              -- lightweight persistent credential, PRD §15.1
    appearance          JSONB NOT NULL DEFAULT '{}'::jsonb,  -- character customization, PRD §12.2/§9.2 — added in v1.1
    is_anonymized       BOOLEAN NOT NULL DEFAULT false,
    anonymized_at       TIMESTAMPTZ NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at        TIMESTAMPTZ NULL
);

CREATE INDEX idx_roster_entries_class_id ON roster_entries(class_id);

COMMENT ON TABLE roster_entries IS
  'PRD §15.2/§15.4/§12.2: persistent per-CLASS student identity so cosmetics/XP/session-history/return-rate metrics (PRD §17) actually accumulate across a term. Row is created once, at first join to the class, and reused across every session of that class — see DBD §3.1. appearance is opaque JSON deliberately (§2.4''s TEXT+CHECK reasoning doesn''t apply to a cosmetic catalog that grows as content, not as schema) — see DBD §3.5 for why it wasn''t in v1.0.';

-- ----------------------------------------------------------------------------
-- 5. SCENARIOS (parent codebase; PRD §8.1 "project scenario")
-- ----------------------------------------------------------------------------
CREATE TABLE scenarios (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   TEXT NOT NULL,
    domain                  TEXT NOT NULL,               -- PRD §12.4, e.g. 'web_development', 'iot'
    departmental_shape      TEXT NOT NULL
                                CHECK (departmental_shape IN ('full_stack', 'specialist')),
    fix_baseline_repo_ref   TEXT NOT NULL,
    manifest_source_ref     TEXT NULL,                   -- git commit/tag the content package was imported from
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE scenarios IS
  'PRD §8.1/§12.4: the parent codebase ("company to work at"). Deliberately separate from scenario_variants — see DBD §3.2.';

-- ----------------------------------------------------------------------------
-- 6. SCENARIO_DEPARTMENTS (many-to-many: which department(s) a scenario targets)
-- ----------------------------------------------------------------------------
CREATE TABLE scenario_departments (
    scenario_id     UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    PRIMARY KEY (scenario_id, department_id)
);

COMMENT ON TABLE scenario_departments IS
  'PRD §11.5.1 metadata: "target department(s)". A specialist scenario has exactly one row here; a full-stack scenario has more than one. (Invariant enforced at the application layer, not by a DB constraint — see DBD §16.)';

-- ----------------------------------------------------------------------------
-- 7. SCENARIO_VARIANTS (an authored issue variant of a scenario, PRD §8.1/§8.4)
-- ----------------------------------------------------------------------------
CREATE TABLE scenario_variants (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id             UUID NOT NULL REFERENCES scenarios(id) ON DELETE RESTRICT,
    difficulty              TEXT NOT NULL
                                CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    category                TEXT NOT NULL
                                CHECK (category IN ('logic_bug', 'security_vulnerability',
                                                     'malicious_script', 'misconfiguration')),
    issue_repo_ref          TEXT NOT NULL,               -- broken-variant repo ref or diff-against-baseline ref
    briefing_text           TEXT NOT NULL,               -- the symptom-only mission briefing (PRD §10.3)
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scenario_variants_scenario_id ON scenario_variants(scenario_id);
CREATE INDEX idx_scenario_variants_difficulty_category ON scenario_variants(difficulty, category);

COMMENT ON TABLE scenario_variants IS
  'PRD §8.1/§8.4/§14: one specific planted defect + its briefing text. difficulty/category are intrinsic tags of the variant, not of the session — see DBD §3.4 for the related session-status fix.';

-- ----------------------------------------------------------------------------
-- 8. VERIFICATION_CHECKS (checks shipped with a variant: full-fix + diagnostics)
-- ----------------------------------------------------------------------------
CREATE TABLE verification_checks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_variant_id     UUID NOT NULL REFERENCES scenario_variants(id) ON DELETE RESTRICT,
    check_type              TEXT NOT NULL
                                CHECK (check_type IN ('full_fix', 'diagnostic')),
    check_key               TEXT NOT NULL,               -- stable slug, e.g. 'full_fix', 'diagnostic_root_cause_file'
    issue_ordinal           INT NULL,                    -- Phase 2 layered incidents: which injected issue this targets
    harness_ref             TEXT NOT NULL,                -- protected trust-zone reference (PRD §8.5) — never a /workspace path
    description             TEXT NOT NULL,
    sort_order              INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (scenario_variant_id, check_key)
);

CREATE INDEX idx_verification_checks_variant_id ON verification_checks(scenario_variant_id);

COMMENT ON TABLE verification_checks IS
  'PRD §8.3: one full_fix check plus zero-or-more diagnostic (partial-credit) checks per variant, and — Phase 2 — one full_fix check per issue_ordinal for layered incidents ("found 2 of 3"). See DBD §3.3.';

-- ----------------------------------------------------------------------------
-- 9. SCENARIO_USAGE_LOG ("no repeat incident" tracking, PRD §11.5.3)
--    ⚠️  DEPRECATED — this table is redundant with `sessions`, which already
--    records (class_id, scenario_variant_id) for every session and is never
--    hard-deleted. The API layer should query `sessions` directly to enforce
--    the "no repeat incident" constraint (PRD §11.5.3) instead of maintaining
--    this separate log. Retained in the DDL for backward compatibility; new
--    code MUST NOT write to this table. Remove in the next schema revision.
-- ----------------------------------------------------------------------------
CREATE TABLE scenario_usage_log (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_variant_id     UUID NOT NULL REFERENCES scenario_variants(id) ON DELETE RESTRICT,
    class_id                UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    session_id              UUID NOT NULL,               -- FK added below, after sessions exists
    used_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scenario_usage_log_variant_class ON scenario_usage_log(scenario_variant_id, class_id);

COMMENT ON TABLE scenario_usage_log IS
  '⚠️ DEPRECATED — redundant with sessions. See §16 item 6. PRD §11.5.3: the API should query sessions(class_id, scenario_variant_id) instead of this table.';

-- ----------------------------------------------------------------------------
-- 10. SESSIONS (one run, PRD §7/§15.3)
-- ----------------------------------------------------------------------------
CREATE TABLE sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id                UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    scenario_variant_id     UUID NOT NULL REFERENCES scenario_variants(id) ON DELETE RESTRICT,
    join_code               VARCHAR(8) NOT NULL,
    department_mode         TEXT NOT NULL DEFAULT 'single_department'
                                CHECK (department_mode IN ('single_department', 'multi_department')),
    status                  TEXT NOT NULL DEFAULT 'created'
                                CHECK (status IN ('created', 'provisioning', 'active',
                                                   'provision_failed', 'ended', 'debriefed', 'torn_down')),
    end_reason              TEXT NULL
                                CHECK (end_reason IN ('time_limit_reached', 'teacher_ended_early',
                                                       'all_teams_resolved', 'abandoned_timeout')),
    time_limit_minutes      INT NOT NULL,
    max_roster_size         INT NULL,
    config                  JSONB NOT NULL DEFAULT '{}'::jsonb,
    cloned_from_session_id  UUID NULL REFERENCES sessions(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at              TIMESTAMPTZ NULL,
    ended_at                TIMESTAMPTZ NULL
);

CREATE INDEX idx_sessions_class_id ON sessions(class_id);
CREATE INDEX idx_sessions_scenario_variant_id ON sessions(scenario_variant_id);
CREATE INDEX idx_sessions_status ON sessions(status) WHERE status NOT IN ('torn_down');
CREATE UNIQUE INDEX idx_sessions_join_code_active ON sessions(join_code) WHERE status NOT IN ('ended');

COMMENT ON TABLE sessions IS
  'PRD §7/§15.3/§12.13. status is lifecycle-only; per-team pedagogical outcome lives on teams.outcome_state, not here — see DBD §3.4.';

ALTER TABLE scenario_usage_log
    ADD CONSTRAINT fk_scenario_usage_log_session
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE RESTRICT;

CREATE INDEX idx_scenario_usage_log_session_id ON scenario_usage_log(session_id);

-- ----------------------------------------------------------------------------
-- 11. TEAMS (one per department per session; PRD §12.3)
-- ----------------------------------------------------------------------------
CREATE TABLE teams (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
    department_id           UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    label                   TEXT NOT NULL,               -- e.g. 'Backend Team', 'Backend Team 2' (Phase 1 sub-teams)
    outcome_state           TEXT NOT NULL DEFAULT 'in_progress'
                                CHECK (outcome_state IN ('in_progress', 'resolved', 'unresolved')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teams_session_id ON teams(session_id);
CREATE INDEX idx_teams_department_id ON teams(department_id);

COMMENT ON TABLE teams IS
  'PRD §12.3/§13.3: outcome_state is the per-team pedagogical result, tracked independently of session.status so multi-team sessions (Phase 1+) can have teams finish at different times/outcomes. See DBD §3.4.';

-- ----------------------------------------------------------------------------
-- 12. TEAM_MEMBERSHIPS (session-scoped join record for a persistent roster_entry)
-- ----------------------------------------------------------------------------
CREATE TABLE team_memberships (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id                 UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    roster_entry_id         UUID NOT NULL REFERENCES roster_entries(id) ON DELETE RESTRICT,
    joined_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at                 TIMESTAMPTZ NULL,
    UNIQUE (team_id, roster_entry_id)
);

CREATE INDEX idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX idx_team_memberships_roster_entry_id ON team_memberships(roster_entry_id);

COMMENT ON TABLE team_memberships IS
  'PRD §12.13 late-join/reconnect: joined_at/left_at track presence across a session; the roster_entry itself persists in roster_entries regardless of this row.';

-- ----------------------------------------------------------------------------
-- 13. ENVIRONMENT_INSTANCES (one per team, PRD §8.1/§8.6/§15.6)
-- ----------------------------------------------------------------------------
CREATE TABLE environment_instances (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id                 UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE RESTRICT,
    sandbox_provider        TEXT NOT NULL
                                CHECK (sandbox_provider IN ('e2b', 'gvisor')),
    provider_ref            TEXT NOT NULL,               -- opaque handle into the provider (SAD §7.1 EnvironmentRef)
    status                  TEXT NOT NULL DEFAULT 'provisioning'
                                CHECK (status IN ('provisioning', 'ready', 'error', 'torn_down')),
    resource_limits         JSONB NOT NULL,               -- {cpuCores, memoryMb, wallClockTimeoutMs} — SAD §7.4
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    torn_down_at            TIMESTAMPTZ NULL
);

CREATE INDEX idx_environment_instances_status ON environment_instances(status) WHERE status <> 'torn_down';

COMMENT ON TABLE environment_instances IS
  'PRD §8.1 (one per team, UNIQUE team_id enforces this relationally) and §8.6 (resource_limits records what was actually applied at provision() time, per SAD §7.4). Contains no student PII by design (PRD §15.6).';

-- ----------------------------------------------------------------------------
-- 14. VERIFICATION_RUNS (server-computed results, PRD §8.3/§8.5)
-- ----------------------------------------------------------------------------
CREATE TABLE verification_runs (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id                     UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    verification_check_id       UUID NOT NULL REFERENCES verification_checks(id) ON DELETE RESTRICT,
    triggered_by_roster_entry_id UUID NULL REFERENCES roster_entries(id) ON DELETE SET NULL,
    result                      TEXT NOT NULL
                                    CHECK (result IN ('pass', 'fail', 'resource_limit_exceeded', 'error')),
    diagnostic_details          JSONB NOT NULL DEFAULT '{}'::jsonb,
    ran_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_runs_team_id ON verification_runs(team_id);
CREATE INDEX idx_verification_runs_check_id ON verification_runs(verification_check_id);
CREATE INDEX idx_verification_runs_triggered_by ON verification_runs(triggered_by_roster_entry_id);

COMMENT ON TABLE verification_runs IS
  'PRD §8.3/§8.5/§8.6: server-computed only, never client-reported. verification_check_id (not just team_id) is what lets the debrief show "found 2 of 3" in Phase 2 layered incidents, and partial-credit diagnostic results in Phase 0. result includes resource_limit_exceeded as a distinct outcome, per PRD §8.6''s requirement that a ceiling breach be visible and not conflated with a legitimate check failure.';

-- ----------------------------------------------------------------------------
-- 15. CONTRIBUTION_EVENTS (generic event log, PRD §12.9/§15.5/§17)
-- ----------------------------------------------------------------------------
CREATE TABLE contribution_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
    team_id                 UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    roster_entry_id         UUID NULL REFERENCES roster_entries(id) ON DELETE SET NULL,
    event_type              TEXT NOT NULL
                                CHECK (event_type IN ('session_joined', 'session_left',
                                                       'desk_seated', 'desk_stood',
                                                       'code_edit_saved', 'check_run_triggered',
                                                       'ping_sent', 'emote_used', 'chat_message_sent')),
    metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contribution_events_session_id ON contribution_events(session_id);
CREATE INDEX idx_contribution_events_team_id ON contribution_events(team_id);
CREATE INDEX idx_contribution_events_roster_entry_id ON contribution_events(roster_entry_id);
CREATE INDEX idx_contribution_events_type_time ON contribution_events(event_type, occurred_at);
CREATE INDEX idx_contribution_events_retention ON contribution_events(occurred_at) WHERE roster_entry_id IS NOT NULL;

COMMENT ON TABLE contribution_events IS
  'PRD §12.9 measurement mechanism + §15.5 chat-transcript retention + §17 engagement instrumentation, all on one generic append-only log. roster_entry_id is nullable to support the retention-window anonymization job (DBD §8) independent of any per-request deletion.';
