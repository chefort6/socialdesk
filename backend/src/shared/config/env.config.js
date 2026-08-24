const REQUIRED_CORE_SECRETS = ["JWT_SECRET", "SUPABASE_URL", "SUPABASE_KEY"];
const DEFAULT_CORS_ALLOWED_ORIGINS = "http://localhost:3000";
const DEFAULT_JSON_BODY_LIMIT = "1mb";

const PLACEHOLDER_VALUES = [
  "test-jwt-secret",
  "http://localhost:54321",
  "test-anon-key",
  "your_jwt_secret",
  "your_supabase_url",
  "your_supabase_key",
];

const PLATFORM_CREDENTIAL_MAP = {
  meta: ["FB_APP_ID", "FB_APP_SECRET", "FB_REDIRECT_URI"],
  tiktok: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI"],
  twitter: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET", "TWITTER_REDIRECT_URI"],
  youtube: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "YOUTUBE_REDIRECT_URI"],
  pinterest: ["PINTEREST_APP_ID", "PINTEREST_APP_SECRET", "PINTEREST_REDIRECT_URI"],
  cloudinary: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
  redis: ["REDIS_URL"],
};

/**
 * Applies developer-friendly default values in non-production environments.
 */
const applyDevDefaults = () => {
  process.env.JWT_SECRET ||= "test-jwt-secret";
  process.env.SUPABASE_URL ||= "http://localhost:54321";
  process.env.SUPABASE_KEY ||= "test-anon-key";
  process.env.CORS_ALLOWED_ORIGINS ||= DEFAULT_CORS_ALLOWED_ORIGINS;
  process.env.TRUST_PROXY ||= "false";
  process.env.JSON_BODY_LIMIT ||= DEFAULT_JSON_BODY_LIMIT;
};

const parseTrustProxy = (value = "false") => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (/^\d+$/.test(normalized)) return Number(normalized);
  throw new Error("[FATAL] TRUST_PROXY must be true, false, or a non-negative integer.");
};

const parseAllowedOrigins = (value) => {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      const parsed = new URL(origin);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin.replace(/\/$/, "")) {
        throw new Error(`[FATAL] Invalid CORS origin: ${origin}. Use an origin only, without a path.`);
      }
      return parsed.origin;
    });

  if (origins.length === 0) {
    throw new Error("[FATAL] CORS_ALLOWED_ORIGINS must contain at least one origin.");
  }

  return origins;
};

const getHttpConfig = ({ isProduction = process.env.NODE_ENV === "production" } = {}) => {
  const corsValue = process.env.CORS_ALLOWED_ORIGINS?.trim();
  const trustProxyValue = process.env.TRUST_PROXY?.trim();

  if (isProduction) {
    const missing = [];
    if (!corsValue) missing.push("CORS_ALLOWED_ORIGINS");
    if (!trustProxyValue) missing.push("TRUST_PROXY");
    if (missing.length > 0) {
      throw new Error(`[FATAL] Missing required production HTTP configuration: ${missing.join(", ")}.`);
    }
  }

  const jsonBodyLimit = process.env.JSON_BODY_LIMIT?.trim() || DEFAULT_JSON_BODY_LIMIT;
  if (!/^\d+(b|kb|mb|gb)$/i.test(jsonBodyLimit)) {
    throw new Error("[FATAL] JSON_BODY_LIMIT must look like 512kb, 1mb, or 1gb.");
  }

  return {
    allowedOrigins: parseAllowedOrigins(corsValue || DEFAULT_CORS_ALLOWED_ORIGINS),
    trustProxy: parseTrustProxy(trustProxyValue || "false"),
    jsonBodyLimit,
  };
};

/**
 * Checks readiness for all optional platform integration secrets.
 */
const getSecretsReadiness = () => {
  const readiness = {};

  for (const [platform, keys] of Object.entries(PLATFORM_CREDENTIAL_MAP)) {
    const missingKeys = keys.filter((key) => {
      const val = process.env[key]?.trim();
      return !val || PLACEHOLDER_VALUES.includes(val);
    });

    readiness[platform] = {
      configured: missingKeys.length === 0,
      missing: missingKeys,
    };
  }

  return readiness;
};

/**
 * Validates environment configuration on server startup.
 *
 * @param {object} options
 * @param {boolean} [options.isProduction] - Override environment check
 * @param {boolean} [options.exitOnError] - Whether to exit process on failure in production
 */
const validateEnv = ({ isProduction = process.env.NODE_ENV === "production", exitOnError = true } = {}) => {
  if (!isProduction) {
    applyDevDefaults();
    const readiness = getSecretsReadiness();
    const unconfigured = Object.entries(readiness)
      .filter(([_, info]) => !info.configured)
      .map(([p]) => p);

    if (unconfigured.length > 0) {
      console.log(`[ENV] Running in ${process.env.NODE_ENV || "development"} mode. Unconfigured optional integrations: ${unconfigured.join(", ")}`);
    } else {
      console.log(`[ENV] Running in ${process.env.NODE_ENV || "development"} mode. All integrations configured.`);
    }

    return { valid: true, mode: "development", readiness, http: getHttpConfig({ isProduction: false }) };
  }

  // Production validation: Fail Fast
  const missingCore = REQUIRED_CORE_SECRETS.filter((secret) => {
    const val = process.env[secret]?.trim();
    return !val || PLACEHOLDER_VALUES.includes(val);
  });

  if (missingCore.length > 0) {
    const errorMessage = `[FATAL] Missing required production secret(s): ${missingCore.join(", ")}. Please populate them in .env before launching in production mode.`;
    console.error(errorMessage);

    if (exitOnError) {
      process.exit(1);
    }

    throw new Error(errorMessage);
  }

  let http;
  try {
    http = getHttpConfig({ isProduction: true });
  } catch (error) {
    console.error(error.message);
    if (exitOnError) process.exit(1);
    throw error;
  }

  const readiness = getSecretsReadiness();
  console.log("[ENV] Production environment validation passed. Core secrets verified.");

  return { valid: true, mode: "production", readiness, http };
};

module.exports = {
  validateEnv,
  getSecretsReadiness,
  applyDevDefaults,
  getHttpConfig,
  parseAllowedOrigins,
  parseTrustProxy,
  REQUIRED_CORE_SECRETS,
  PLACEHOLDER_VALUES,
};
