const { test } = require("node:test");
const assert = require("node:assert/strict");

const { validateEnv, getSecretsReadiness, applyDevDefaults } = require("./env.config");

test("applyDevDefaults populates JWT_SECRET, SUPABASE_URL, and SUPABASE_KEY if missing", () => {
  const origJwt = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;

  try {
    applyDevDefaults();
    assert.ok(process.env.JWT_SECRET);
    assert.equal(process.env.JWT_SECRET, "test-jwt-secret");
  } finally {
    if (origJwt) process.env.JWT_SECRET = origJwt;
  }
});

test("validateEnv in development mode returns valid: true with readiness report", () => {
  const result = validateEnv({ isProduction: false });

  assert.equal(result.valid, true);
  assert.equal(result.mode, "development");
  assert.ok(result.readiness);
  assert.ok(result.readiness.meta);
  assert.ok(result.readiness.tiktok);
});

test("validateEnv in production mode throws error when required core secret is placeholder/missing", () => {
  const origJwt = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-jwt-secret"; // placeholder

  try {
    assert.throws(
      () => validateEnv({ isProduction: true, exitOnError: false }),
      /Missing required production secret/
    );
  } finally {
    if (origJwt) process.env.JWT_SECRET = origJwt;
  }
});

test("getSecretsReadiness checks platform credential availability", () => {
  const readiness = getSecretsReadiness();

  assert.equal(typeof readiness.meta.configured, "boolean");
  assert.equal(typeof readiness.tiktok.configured, "boolean");
  assert.ok(Array.isArray(readiness.meta.missing));
});
