#!/usr/bin/env node
/**
 * Smoke test against a running SIMS instance (default http://localhost:3000)
 * Run: npm run smoke  (requires server + seeded DB)
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

async function check(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    ...opts,
  });
  return res;
}

async function main() {
  const failures = [];

  const loginPage = await check("/login");
  if (loginPage.status !== 200) failures.push(`GET /login -> ${loginPage.status}`);

  const home = await check("/");
  if (![307, 302, 200].includes(home.status)) {
    failures.push(`GET / -> ${home.status}`);
  }

  const dash = await check("/dashboard");
  if (![307, 302].includes(dash.status)) {
    failures.push(`GET /dashboard (anon) should redirect, got ${dash.status}`);
  }

  // Credential login via next-auth CSRF flow is heavy; verify API route exists
  const auth = await check("/api/auth/providers");
  if (auth.status !== 200) failures.push(`GET /api/auth/providers -> ${auth.status}`);

  if (failures.length) {
    console.error("SMOKE FAILED:");
    failures.forEach((f) => console.error(" -", f));
    process.exit(1);
  }
  console.log("SMOKE OK — login page, redirects, and auth providers healthy");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
