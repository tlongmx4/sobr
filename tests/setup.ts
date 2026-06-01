// Test-process env defaults. These are existing app secrets (JWT_SECRET,
// CRON_SECRET) — set here only for the test process so handlers that read them
// have deterministic values. No new app env vars are introduced.
process.env.JWT_SECRET ??= "test-jwt-secret-do-not-use-in-prod";
process.env.CRON_SECRET ??= "test-cron-secret";
