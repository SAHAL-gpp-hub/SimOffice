CREATE OR REPLACE FUNCTION anonymize_expired_contribution_events(retention_days INT DEFAULT 180)
RETURNS INT AS $$
DECLARE
    affected INT;
BEGIN
    UPDATE contribution_events
       SET roster_entry_id = NULL
     WHERE roster_entry_id IS NOT NULL
       AND occurred_at < now() - make_interval(days => retention_days);
    GET DIAGNOSTICS affected = ROW_COUNT;
    RETURN affected;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION anonymize_roster_entry(target_roster_entry_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE roster_entries
       SET display_name = 'Deleted Student',
           roster_passcode_hash = 'invalidated',
           is_anonymized = true,
           anonymized_at = now()
     WHERE id = target_roster_entry_id;

    UPDATE contribution_events
       SET roster_entry_id = NULL
     WHERE roster_entry_id = target_roster_entry_id;

    UPDATE verification_runs
       SET triggered_by_roster_entry_id = NULL
     WHERE triggered_by_roster_entry_id = target_roster_entry_id;

    -- team_memberships intentionally NOT modified — see reasoning above.
END;
$$ LANGUAGE plpgsql;
