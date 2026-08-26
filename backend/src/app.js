const express = require("express");
const facebookRoutes = require("./modules/meta/meta.routes");
const pinterestRoutes = require("./modules/pinterest/pinterest.routes");
const youtubeRoutes = require("./modules/youtube/youtube.routes");
const twitterRoutes = require("./modules/twitter/twitter.routes");
const tiktokRoutes = require("./modules/tiktok/tiktok.routes");
const authRoutes = require("./modules/auth/auth.routes");

const scheduledPostsRoutes = require("./modules/scheduled-posts/scheduled-posts.routes");
const postsRoutes = require("./modules/posts/posts.routes");
const accountsRoutes = require("./modules/accounts/accounts.routes");
const analyticsRoutes = require("./modules/analytics/analytics.routes");
const usersRoutes = require("./modules/users/users.routes");
const platformHealthRoutes = require("./modules/platform-health/platform-health.routes");
const accountAdminRoutes = require("./modules/account-admin/account-admin.routes");
const saasAnalyticsRoutes = require("./modules/saas-analytics/saas-analytics.routes");
const settingsRoutes = require("./modules/settings/settings.routes");
const notificationsRoutes = require("./modules/notifications/notifications.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const socialConnectionsRoutes = require("./modules/social-connections/social-connections.routes");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { getHttpConfig } = require("./shared/config/env.config");
const { notFound, handleError } = require("./shared/middleware/error.middleware");

const app = express();
const { allowedOrigins, trustProxy, jsonBodyLimit } = getHttpConfig();

app.set("trust proxy", trustProxy);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin not allowed");
      error.statusCode = 403;
      error.publicMessage = "Origin not allowed";
      return callback(error);
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: jsonBodyLimit }));

app.get("/api/", (req, res) => {
  res.json({ status: "ok" });
});

// routes
app.use("/api/auth", authRoutes);
app.use("/api/auth/facebook", facebookRoutes);
app.use("/api/auth/pinterest", pinterestRoutes);
app.use("/api/auth/youtube", youtubeRoutes);
app.use("/api/auth/twitter", twitterRoutes);
app.use("/api/auth/tiktok", tiktokRoutes);

app.use("/api/posts", postsRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/scheduled-posts", scheduledPostsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/platform-health", platformHealthRoutes);
app.use("/api/account-admin", accountAdminRoutes);
app.use("/api/saas-analytics", saasAnalyticsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/social-connections", socialConnectionsRoutes);

app.use(notFound);
app.use(handleError);

module.exports = app;
