const PORT = process.env.PORT || 5000;

const dotenv = require("dotenv");
dotenv.config();

const { validateEnv } = require("./src/shared/config/env.config");
validateEnv();

const app = require("./src/app");

const scheduledPostsQueue = require("./src/modules/scheduled-posts/scheduled-posts.queue");
const analyticsQueue = require("./src/modules/analytics/analytics.queue");

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  scheduledPostsQueue.start().catch((error) => {
    console.error("Failed to start scheduled posts queue:", error.message || error);
  });
  analyticsQueue.start().catch((error) => {
    console.error("Failed to start analytics queue:", error.message || error);
  });
});

