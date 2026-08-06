/**
 * GET /api/platform-health — placeholder for the admin-only platform health
 * surface. The route is real and enforced by requireAdmin; the actual health
 * checks (DB/Redis/uptime) are a separate future ticket, so this returns 501
 * rather than faking a 200.
 */
const { getSecretsReadiness } = require("../../shared/config/env.config");

exports.getPlatformHealth = async (req, res) => {
  const readiness = getSecretsReadiness();
  const uptime = process.uptime();

  res.status(200).json({
    success: true,
    data: {
      status: "healthy",
      uptime: `${Math.floor(uptime)}s`,
      environment: process.env.NODE_ENV || "development",
      secretsReadiness: readiness,
    },
  });
};

