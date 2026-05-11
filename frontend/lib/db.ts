// ──────────────────────────────────────────────────────────────
// DEPRECATED: This file is NOT used in the current architecture.
// Database access is handled by Django's backend ORM.
// This file previously contained a direct PostgreSQL connection
// with credentials, which is a security risk in a frontend bundle.
//
// These stubs exist only to prevent build errors from legacy API
// route files that import from this module.
// ──────────────────────────────────────────────────────────────

// Stub: query — always throws (unused)
export async function query(_text: string, _params?: any[]) {
  throw new Error('DEPRECATED: Direct database access from frontend is disabled. Use Django API instead.');
}

// Stub: getClient — always throws (unused)
export async function getClient() {
  throw new Error('DEPRECATED: Direct database access from frontend is disabled. Use Django API instead.');
}
