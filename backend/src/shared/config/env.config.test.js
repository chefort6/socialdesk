const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  validateEnv,
  getSecretsReadiness,
  applyDevDefaults,
  getHttpConfig,
} = require("./env.config");

function restoreEnv(t, keys) {
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test("applyDevDefaults populates safe local defaults", (t) => {
  restoreEnv(t, ["JWT_SECRET", "CORS_ALLOWED_ORIGINS", "TRUST_PROXY", "JSON_BODY_LIMIT"]);
  delete process.env.JWT_SECRET;
  delete process.env.CORS_ALLOWED_ORIGINS;
  delete process.env.TRUST_PROXY;
  delete process.env.JSON_BODY_LIMIT;

  applyDevDefaults();

  assert.equal(process.env.JWT_SECRET, "test-jwt-secret");
  assert.equal(process.env.CORS_ALLOWED_ORIGINS, "http://localhost:3000");
  assert.equal(process.env.TRUST_PROXY, "false");
  assert.equal(process.env.JSON_BODY_LIMIT, "1mb");
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

test("getHttpConfig parses multiple origins, proxy count, and body limit", (t) => {
  restoreEnv(t, ["CORS_ALLOWED_ORIGINS", "TRUST_PROXY", "JSON_BODY_LIMIT"]);
  process.env.CORS_ALLOWED_ORIGINS = "http://localhost:3000, https://app.socialdesk.example/";
  process.env.TRUST_PROXY = "1";
  process.env.JSON_BODY_LIMIT = "512kb";

  assert.deepEqual(getHttpConfig(), {
    allowedOrigins: ["http://localhost:3000", "https://app.socialdesk.example"],
    trustProxy: 1,
    jsonBodyLimit: "512kb",
  });
});

test("getHttpConfig rejects an invalid proxy value", (t) => {
  restoreEnv(t, ["TRUST_PROXY"]);
  process.env.TRUST_PROXY = "trust-everyone";

  assert.throws(() => getHttpConfig(), /TRUST_PROXY must be true, false, or a non-negative integer/);
});

test("production validation requires explicit CORS and proxy configuration", (t) => {
  restoreEnv(t, [
    "JWT_SECRET",
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "CORS_ALLOWED_ORIGINS",
    "TRUST_PROXY",
  ]);
  process.env.JWT_SECRET = "real-production-jwt-secret";
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_KEY = "real-production-supabase-key";
  delete process.env.CORS_ALLOWED_ORIGINS;
  delete process.env.TRUST_PROXY;

  assert.throws(
    () => validateEnv({ isProduction: true, exitOnError: false }),
    /Missing required production HTTP configuration: CORS_ALLOWED_ORIGINS, TRUST_PROXY/,
  );
});
