\dt
\dv
\df anonymize*
SELECT code, display_name FROM departments;

-- Set up test data for retention function
INSERT INTO accounts (id, role, email, password_hash, display_name)
VALUES ('11111111-1111-1111-1111-111111111111', 'teacher', 'teacher@test.com', 'hash', 'Test Teacher');

INSERT INTO classes (id, teacher_account_id, name)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Test Class');

INSERT INTO roster_entries (id, class_id, display_name, roster_passcode_hash)
VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Test Student', 'hash');

INSERT INTO scenarios (id, title, domain, departmental_shape, fix_baseline_repo_ref)
VALUES ('44444444-4444-4444-4444-444444444444', 'Test Scenario', 'test', 'specialist', 'ref');

INSERT INTO scenario_variants (id, scenario_id, difficulty, category, issue_repo_ref, briefing_text)
VALUES ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'beginner', 'logic_bug', 'ref', 'brief');

INSERT INTO sessions (id, class_id, scenario_variant_id, join_code, time_limit_minutes)
VALUES ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'JOINCODE', 60);

-- Note: we need the backend department id
DO $$
DECLARE
    backend_id UUID;
BEGIN
    SELECT id INTO backend_id FROM departments WHERE code = 'backend';
    
    INSERT INTO teams (id, session_id, department_id, label)
    VALUES ('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', backend_id, 'Backend Team');
END $$;

-- Insert an expired event (e.g. 20 days ago)
INSERT INTO contribution_events (id, session_id, team_id, roster_entry_id, event_type, occurred_at)
VALUES ('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'session_joined', now() - interval '20 days');

-- Verify row exists with attribution
SELECT event_type, roster_entry_id FROM contribution_events WHERE id = '88888888-8888-8888-8888-888888888888';

-- Call retention for 10 days
SELECT anonymize_expired_contribution_events(10);

-- Verify attribution is gone (should be NULL)
SELECT event_type, roster_entry_id FROM contribution_events WHERE id = '88888888-8888-8888-8888-888888888888';
