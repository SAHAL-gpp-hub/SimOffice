/**
 * Typed REST client for roster-related API calls.
 *
 * Wraps POST /sessions/join and PATCH /roster-entries/{id}/character
 * per API Spec v1.1 §3.2 and §11.1. All network errors are re-thrown
 * with a typed ApiError so callers can render appropriate UI states.
 */

const API_BASE = '/api';

export interface ApiError {
  status: number;
  code: string;
  message: string;
}

function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'status' in err;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = body?.error ?? body?.message ?? 'UNKNOWN_ERROR';
    throw { status: res.status, code, message: code } satisfies ApiError;
  }
  return body as T;
}

// ── Join Session (API Spec §3.2) ─────────────────────────────────────────────

export interface JoinRequest {
  joinCode: string;
  displayName: string;
  rosterPasscode?: string;
}

export interface JoinResponse {
  rosterEntryId: string;
  rosterPasscode: string;
  /** Empty object {} when no appearance has been saved yet (route to SCR-07). */
  appearance: Record<string, string>;
  sessionId: string;
  teamId: string | null;
  token: string;
  wsRoomUrl: string | null;
}

export async function joinSession(payload: JoinRequest): Promise<JoinResponse> {
  const res = await fetch(`${API_BASE}/sessions/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseResponse<JoinResponse>(res);
}

// ── Update Character (API Spec §11.1) ────────────────────────────────────────

export interface UpdateCharacterRequest {
  appearance: { colorScheme: string };
  displayName?: string;
}

export interface UpdateCharacterResponse {
  rosterEntryId: string;
  displayName: string;
  appearance: { colorScheme: string };
}

export async function updateCharacter(
  rosterEntryId: string,
  token: string,
  payload: UpdateCharacterRequest,
): Promise<UpdateCharacterResponse> {
  const res = await fetch(
    `${API_BASE}/roster-entries/${rosterEntryId}/character`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );
  return parseResponse<UpdateCharacterResponse>(res);
}

export { isApiError };
