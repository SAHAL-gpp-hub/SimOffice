CREATE OR REPLACE VIEW team_debrief_summary AS
WITH scenario_checks AS (
    SELECT 
        s.id AS session_id,
        COUNT(*) FILTER (WHERE vc.check_type = 'full_fix') AS total_full_fix,
        COUNT(*) FILTER (WHERE vc.check_type = 'diagnostic') AS total_diagnostic
    FROM sessions s
    JOIN scenario_variants sv ON sv.id = s.scenario_variant_id
    JOIN verification_checks vc ON vc.scenario_variant_id = sv.id
    GROUP BY s.id
)
SELECT
    t.id                AS team_id,
    t.session_id,
    t.department_id,
    d.display_name      AS department_name,
    t.label,
    t.outcome_state,
    COUNT(DISTINCT vc.id) FILTER (WHERE vr.result = 'pass' AND vc.check_type = 'full_fix') AS full_fix_checks_passed,
    sc.total_full_fix                                                                      AS full_fix_checks_total,
    COUNT(DISTINCT vc.id) FILTER (WHERE vr.result = 'pass' AND vc.check_type = 'diagnostic') AS diagnostic_checks_passed,
    sc.total_diagnostic                                                                    AS diagnostic_checks_total,
    MIN(vr.ran_at) FILTER (WHERE vr.result = 'pass')                                       AS first_pass_at
FROM teams t
JOIN departments d ON d.id = t.department_id
LEFT JOIN scenario_checks sc ON sc.session_id = t.session_id
LEFT JOIN verification_runs vr ON vr.team_id = t.id
LEFT JOIN verification_checks vc ON vc.id = vr.verification_check_id
GROUP BY t.id, t.session_id, t.department_id, d.display_name, t.label, t.outcome_state, sc.total_full_fix, sc.total_diagnostic;

CREATE OR REPLACE VIEW student_contribution_summary AS
WITH event_counts AS (
    SELECT
        roster_entry_id,
        session_id,
        team_id,
        COUNT(*) FILTER (WHERE event_type = 'code_edit_saved')   AS code_edits,
        COUNT(*) FILTER (WHERE event_type = 'chat_message_sent') AS chat_messages,
        COUNT(*) FILTER (WHERE event_type = 'ping_sent')         AS pings_sent,
        COUNT(*) FILTER (WHERE event_type = 'emote_used')        AS emotes_used
    FROM contribution_events
    WHERE roster_entry_id IS NOT NULL
    GROUP BY roster_entry_id, session_id, team_id
),
verification_counts AS (
    SELECT
        triggered_by_roster_entry_id AS roster_entry_id,
        team_id,
        COUNT(*) FILTER (WHERE result = 'pass') AS verifications_triggered_pass
    FROM verification_runs
    WHERE triggered_by_roster_entry_id IS NOT NULL
    GROUP BY triggered_by_roster_entry_id, team_id
)
SELECT
    re.id                AS roster_entry_id,
    re.display_name,
    t.session_id,
    tm.team_id,
    COALESCE(ec.code_edits, 0) AS code_edits,
    COALESCE(ec.chat_messages, 0) AS chat_messages,
    COALESCE(ec.pings_sent, 0) AS pings_sent,
    COALESCE(ec.emotes_used, 0) AS emotes_used,
    COALESCE(vc.verifications_triggered_pass, 0) AS verifications_triggered_pass
FROM team_memberships tm
JOIN roster_entries re ON re.id = tm.roster_entry_id
JOIN teams t ON t.id = tm.team_id
LEFT JOIN event_counts ec ON ec.roster_entry_id = tm.roster_entry_id AND ec.team_id = tm.team_id
LEFT JOIN verification_counts vc ON vc.roster_entry_id = tm.roster_entry_id AND vc.team_id = tm.team_id;
