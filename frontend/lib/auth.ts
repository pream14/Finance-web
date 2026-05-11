// ──────────────────────────────────────────────────────────────
// DEPRECATED: This file is NOT used in the current architecture.
// Authentication is handled by Django's TokenAuthentication backend.
// See: frontend/lib/api.ts → authApi.login() → Django /api-auth/token/
//
// These stubs exist only to prevent build errors from legacy API
// route files that import from this module. The API routes under
// /api/auth/login, /api/customers, /api/expenses, /api/collections
// are also unused — the frontend calls Django directly.
// ──────────────────────────────────────────────────────────────

// Stub: verifyCredentials — always rejects (unused)
export async function verifyCredentials(
  _email: string,
  _password: string
): Promise<null> {
  console.warn('DEPRECATED: verifyCredentials called on legacy auth module');
  return null;
}

// Stub: createSession — returns empty string (unused)
export function createSession(
  _userId: number,
  _email: string,
  _role: string
): string {
  console.warn('DEPRECATED: createSession called on legacy auth module');
  return '';
}

// Stub: getSession — always returns null (unused)
export function getSession(_token: string) {
  return null;
}

// Stub: deleteSession — no-op (unused)
export function deleteSession(_token: string) {
  // no-op
}
