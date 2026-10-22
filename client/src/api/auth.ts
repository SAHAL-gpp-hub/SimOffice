/**
 * Typed REST client for authentication endpoints (TDD §8, API Spec §2).
 */

const API_BASE = '/api';

export interface LoginResponse {
  token: string;
}

export interface TeacherProfile {
  id: string;
  email: string;
  displayName: string;
  role: 'teacher' | 'admin';
}

export async function loginTeacher(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = body?.message || body?.error || 'Login failed';
    throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
  }

  return body as LoginResponse;
}

export async function getTeacherProfile(token: string): Promise<TeacherProfile> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || 'Failed to fetch profile');
  }

  return body as TeacherProfile;
}
