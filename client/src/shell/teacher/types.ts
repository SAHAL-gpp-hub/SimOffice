export interface DashboardRosterEntry {
  rosterEntryId: string;
  displayName: string;
  connected: boolean;
  seated: boolean;
  deskId?: string;
}

export interface DashboardTeam {
  teamId: string;
  departmentCode: string;
  outcomeState: 'in_progress' | 'resolved' | 'unresolved';
  fullFixChecksPassed: number;
  fullFixChecksTotal: number;
  diagnosticChecksPassed: number;
  roster: DashboardRosterEntry[];
}

export interface DashboardData {
  sessionStatus?: 'created' | 'provisioning' | 'active' | 'ended' | 'debriefed' | 'torn_down' | string;
  teams: DashboardTeam[];
}

export interface TeamDebriefSummary {
  team_id: string;
  label?: string;
  department_name?: string;
  outcome_state: 'resolved' | 'unresolved' | 'in_progress';
  full_fix_checks_passed: number;
  full_fix_checks_total: number;
  diagnostic_checks_passed: number;
  diagnostic_checks_total: number;
  first_pass_at?: string | null;
  fix_revealed_at?: string | null;
}

export interface DebriefData {
  sessionStatus: string;
  teams: TeamDebriefSummary[];
}

export type TeamFilterMode = 'all' | 'in_progress' | 'resolved';

export interface HintPreset {
  id: string;
  category: string;
  label: string;
  text: string;
}

export const DEFAULT_HINT_PRESETS: HintPreset[] = [
  {
    id: 'syntax-log',
    category: 'Diagnostics',
    label: 'Inspect Logs',
    text: 'Inspect your workstation terminal outputs and check for unhandled exceptions or error logs in the service.'
  },
  {
    id: 'auth-route',
    category: 'Logic',
    label: 'Verify Auth Handler',
    text: 'Check the controller route and verify request payload validation and status code expectations.'
  },
  {
    id: 'db-migration',
    category: 'Database',
    label: 'Review Migrations',
    text: 'Confirm that recent schema migrations were applied cleanly and check for nullable column mismatches.'
  },
  {
    id: 'test-suite',
    category: 'Verification',
    label: 'Run Test Target',
    text: 'Run the specific unit and integration test suites using the workstation test runner to pinpoint failure points.'
  }
];

export const DEFAULT_BROADCAST_PRESETS = [
  '[TIME CHECK] 10 minutes remaining in the incident simulation window.',
  '[FINAL NOTICE] 5 minutes remaining: Complete your active commits and verify all checks.',
  '[DIAGNOSTIC ADVISORY] Check terminal logs for stack traces before testing fixes.',
  '[FACULTY NOTICE] Instructor will be reviewing team progress shortly.'
];
