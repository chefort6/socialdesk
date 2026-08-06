const REQUIRED_CORE_SECRETS = ["JWT_SECRET", "SUPABASE_URL", "SUPABASE_KEY"];

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

    return { valid: true, mode: "development", readiness };
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

  const readiness = getSecretsReadiness();
  console.log("[ENV] Production environment validation passed. Core secrets verified.");

  return { valid: true, mode: "production", readiness };
};

module.exports = {
  validateEnv,
  getSecretsReadiness,
  applyDevDefaults,
  REQUIRED_CORE_SECRETS,
  PLACEHOLDER_VALUES,
};
