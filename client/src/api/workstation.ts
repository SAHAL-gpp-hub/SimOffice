/**
 * Typed REST client for workstation endpoints (API Spec v1.1 §7.1–§7.5).
 *
 * Route prefix: /api/teams/:teamId/workstation/...
 * Auth:         Authorization: Bearer <token>   (RosterGuard on the server)
 *
 * Error codes surface as WorkstationApiError so the overlay state machine
 * can branch explicitly on ENVIRONMENT_NOT_READY, RESOURCE_LIMIT_EXCEEDED,
 * AUTH_EXPIRED, and generic errors rather than treating all failures the same.
 */

const API_BASE = '/api';

// ── Error types ──────────────────────────────────────────────────────────────

export type WorkstationErrorCode =
  | 'ENVIRONMENT_NOT_READY'   // 409 — env still provisioning or session not active
  | 'RESOURCE_LIMIT_EXCEEDED' // 422 — informal run-check hit CPU/wall-clock ceiling
  | 'AUTH_EXPIRED'            // 401 — roster token has expired; user must rejoin
  | 'PAYLOAD_TOO_LARGE'       // 413 — file content > 1MB
  | 'INVALID_PATH'            // 400 — path traversal attempt
  | 'UNKNOWN_ERROR';          // anything else

export interface WorkstationApiError {
  status: number;
  code: WorkstationErrorCode;
  message: string;
}

function isWorkstationApiError(err: unknown): err is WorkstationApiError {
  return typeof err === 'object' && err !== null && 'code' in err;
}

function codeFromStatus(status: number, bodyCode: string): WorkstationErrorCode {
  if (status === 409) return 'ENVIRONMENT_NOT_READY';
  if (status === 422) return 'RESOURCE_LIMIT_EXCEEDED';
  if (status === 401) return 'AUTH_EXPIRED';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  if (status === 400) return 'INVALID_PATH';
  if (bodyCode === 'ENVIRONMENT_NOT_READY') return 'ENVIRONMENT_NOT_READY';
  if (bodyCode === 'RESOURCE_LIMIT_EXCEEDED') return 'RESOURCE_LIMIT_EXCEEDED';
  return 'UNKNOWN_ERROR';
}

async function parseResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const bodyCode = body?.error ?? body?.message ?? '';
    const code = codeFromStatus(res.status, bodyCode);
    throw { status: res.status, code, message: bodyCode || code } satisfies WorkstationApiError;
  }
  return body as T;
}

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ── Data shapes ──────────────────────────────────────────────────────────────

export interface FileNode {
  path: string;
  type: 'file' | 'directory';
}

export interface RunCheckResult {
  result: 'pass' | 'fail';
  output: string;
}

export type VerificationResult = 'pass' | 'fail' | 'resource_limit_exceeded' | 'error';

export interface VerificationRunResult {
  checkId: string;
  checkType: 'full_fix' | 'diagnostic';
  result: VerificationResult;
  diagnosticDetails: Record<string, unknown>;
}

export interface SubmitVerificationResponse {
  runs: VerificationRunResult[];
  outcomeState: 'in_progress' | 'resolved' | 'unresolved';
}

// ── §7.1 — List files ────────────────────────────────────────────────────────

export async function listFiles(
  teamId: string,
  token: string,
): Promise<{ files: FileNode[] }> {
  const res = await fetch(`${API_BASE}/teams/${teamId}/workstation/files`, {
    headers: authHeaders(token),
  });
  return parseResponse<{ files: FileNode[] }>(res);
}

// ── §7.2 — Read file ─────────────────────────────────────────────────────────

export async function readFile(
  teamId: string,
  token: string,
  path: string,
): Promise<{ path: string; content: string }> {
  const res = await fetch(
    `${API_BASE}/teams/${teamId}/workstation/files/${path}`,
    { headers: authHeaders(token) },
  );
  return parseResponse<{ path: string; content: string }>(res);
}

// ── §7.3 — Write file (debounced auto-save) ───────────────────────────────────

export async function writeFile(
  teamId: string,
  token: string,
  path: string,
  content: string,
): Promise<{ saved: boolean; savedAt: string }> {
  const res = await fetch(
    `${API_BASE}/teams/${teamId}/workstation/files/${path}`,
    {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ content }),
    },
  );
  return parseResponse<{ saved: boolean; savedAt: string }>(res);
}

// ── §7.4 — Run check (informal) ───────────────────────────────────────────────

export async function runCheck(
  teamId: string,
  token: string,
): Promise<RunCheckResult> {
  const res = await fetch(
    `${API_BASE}/teams/${teamId}/workstation/run-check`,
    {
      method: 'POST',
      headers: authHeaders(token),
    },
  );
  return parseResponse<RunCheckResult>(res);
}

// ── §7.5 — Submit verification (formal, graded) ───────────────────────────────

export async function submitVerification(
  teamId: string,
  token: string,
): Promise<SubmitVerificationResponse> {
  const res = await fetch(
    `${API_BASE}/teams/${teamId}/workstation/submit-verification`,
    {
      method: 'POST',
      headers: authHeaders(token),
    },
  );
  return parseResponse<SubmitVerificationResponse>(res);
}

export { isWorkstationApiError };
