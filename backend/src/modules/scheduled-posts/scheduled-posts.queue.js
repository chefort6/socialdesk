const { Queue, Worker } = require("bullmq");

const scheduledPostsService = require("./scheduled-posts.service");

const DEFAULT_RECOVERY_PATTERN = "*/15 * * * *";
const DEFAULT_PUBLISH_ATTEMPTS = 3;
const DEFAULT_BACKOFF_DELAY_MS = 30000;
const DEFAULT_WORKER_CONCURRENCY = 5;
const DEFAULT_QUEUE_NAME = "scheduled-posts";
const SCHEDULER_ID = "scheduled-posts-due-targets";

const JOB_NAMES = {
  RECOVER_DUE_TARGETS: "recover-due-targets",
  PUBLISH_TARGET: "publish-target",
};

let schedulerQueue = null;
let publishingQueue = null;
let schedulerWorker = null;
let publishingWorker = null;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const isEnabled = () => {
  const enabled = process.env.SCHEDULED_POSTS_QUEUE_ENABLED
    ?? process.env.SCHEDULED_POSTS_CRON_ENABLED
    ?? "true";

  return enabled !== "false";
};

const getSchedulerPattern = () => {
  return process.env.SCHEDULED_POSTS_RECOVERY_PATTERN
    || process.env.SCHEDULED_POSTS_SCHEDULER_PATTERN
    || process.env.SCHEDULED_POSTS_CRON_EXPRESSION
    || DEFAULT_RECOVERY_PATTERN;
};

const isRecoveryEnabled = () => {
  return process.env.SCHEDULED_POSTS_RECOVERY_ENABLED !== "false";
};

const getQueueName = () => {
  return process.env.SCHEDULED_POSTS_QUEUE_NAME || DEFAULT_QUEUE_NAME;
};

const getConnection = () => {
  if (process.env.REDIS_URL) {
    const redisUrl = new URL(process.env.REDIS_URL);
    const db = Number.parseInt(redisUrl.pathname.slice(1) || "0", 10);

    return {
      host: redisUrl.hostname,
      port: parsePositiveInteger(redisUrl.port, 6379),
      username: redisUrl.username || undefined,
      password: redisUrl.password || undefined,
      db: Number.isInteger(db) ? db : 0,
      tls: redisUrl.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  }

  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parsePositiveInteger(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number.parseInt(process.env.REDIS_DB || "0", 10),
    maxRetriesPerRequest: null,
  };
};

const getPublishAttempts = () => {
  return parsePositiveInteger(
    process.env.SCHEDULED_POSTS_QUEUE_ATTEMPTS,
    DEFAULT_PUBLISH_ATTEMPTS,
  );
};

const getBackoffDelay = () => {
  return parsePositiveInteger(
    process.env.SCHEDULED_POSTS_QUEUE_BACKOFF_DELAY_MS,
    DEFAULT_BACKOFF_DELAY_MS,
  );
};

const getWorkerConcurrency = () => {
  return parsePositiveInteger(
    process.env.SCHEDULED_POSTS_QUEUE_CONCURRENCY,
    DEFAULT_WORKER_CONCURRENCY,
  );
};

const createSchedulerQueue = () => {
  return new Queue(`${getQueueName()}-scheduler`, {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: 100,
    },
  });
};

const createPublishingQueue = () => {
  return new Queue(`${getQueueName()}-publisher`, {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: getPublishAttempts(),
      backoff: {
        type: "exponential",
        delay: getBackoffDelay(),
      },
      removeOnComplete: true,
      removeOnFail: 1000,
    },
  });
};

const getPublishingQueue = () => {
  if (!publishingQueue) {
    publishingQueue = createPublishingQueue();
  }

  return publishingQueue;
};

const logQueueError = (label) => (error) => {
  console.error(`${label} error:`, error.message || error);
};

const attachQueueListeners = () => {
  schedulerQueue.on("error", logQueueError("Scheduled posts scheduler queue"));
  publishingQueue.on("error", logQueueError("Scheduled posts publisher queue"));
};

const startScheduler = async () => {
  if (!isRecoveryEnabled()) {
    return;
  }

  await schedulerQueue.upsertJobScheduler(
    SCHEDULER_ID,
    { pattern: getSchedulerPattern() },
    {
      name: JOB_NAMES.RECOVER_DUE_TARGETS,
      data: {},
      opts: {
        removeOnComplete: true,
        removeOnFail: 100,
      },
    },
  );
};

const createWorkers = () => {
  schedulerWorker = new Worker(
    schedulerQueue.name,
    async () => scheduledPostsService.enqueueDueScheduledPosts({
      publishingQueue,
      jobName: JOB_NAMES.PUBLISH_TARGET,
    }),
    { connection: getConnection() },
  );

  publishingWorker = new Worker(
    publishingQueue.name,
    async (job) => scheduledPostsService.processQueuedTarget({
      postTargetId: job.data.postTargetId,
      markFailedOnError: job.attemptsMade + 1 >= (job.opts.attempts || getPublishAttempts()),
    }),
    {
      connection: getConnection(),
      concurrency: getWorkerConcurrency(),
    },
  );

  schedulerWorker.on("completed", (job, result) => {
    console.log(`Scheduled posts queued ${result.enqueued} target(s) from job ${job.id}`);
  });

  schedulerWorker.on("failed", (job, error) => {
    console.error("Scheduled posts scheduler job failed:", job?.id, error.message || error);
  });

  schedulerWorker.on("error", logQueueError("Scheduled posts scheduler worker"));

  publishingWorker.on("completed", (job) => {
    console.log(`Scheduled post target job completed: ${job.id}`);
  });

  publishingWorker.on("failed", (job, error) => {
    console.error("Scheduled post target job failed:", job?.id, error.message || error);
  });

  publishingWorker.on("error", logQueueError("Scheduled posts publisher worker"));
};

exports.start = async () => {
  if (!isEnabled()) {
    console.log("Scheduled posts queue is disabled");
    return null;
  }

  if (schedulerQueue || publishingQueue) {
    return { schedulerQueue, publishingQueue };
  }

  schedulerQueue = createSchedulerQueue();
  publishingQueue = getPublishingQueue();
  attachQueueListeners();

  try {
    await startScheduler();
    createWorkers();
  } catch (error) {
    await exports.stop();
    throw error;
  }

  const recoveryStatus = isRecoveryEnabled()
    ? `recovery pattern: ${getSchedulerPattern()}`
    : "recovery disabled";
  console.log(`Scheduled posts queue started with ${recoveryStatus}`);
  return { schedulerQueue, publishingQueue };
};

exports.schedulePostTargets = async ({ postId }) => {
  return scheduledPostsService.schedulePostTargets({
    publishingQueue: getPublishingQueue(),
    jobName: JOB_NAMES.PUBLISH_TARGET,
    postId,
  });
};

exports.cancelPostTargets = async ({ postId }) => {
  return scheduledPostsService.cancelPostTargets({
    publishingQueue: getPublishingQueue(),
    postId,
  });
};

exports.cancelPostTargetsByAccountId = async ({ accountId }) => {
  return scheduledPostsService.cancelPostTargetsByAccountId({
    publishingQueue: getPublishingQueue(),
    accountId,
  });
};

exports.getQueueHealth = async () => {
  const enabled = isEnabled();
  const conn = getConnection();

  if (!enabled) {
    return {
      enabled: false,
      status: "disabled",
      redis: { host: conn.host, port: conn.port },
      publishingQueue: null,
      schedulerQueue: null,
      config: {
        recoveryEnabled: isRecoveryEnabled(),
        recoveryPattern: getSchedulerPattern(),
        concurrency: getWorkerConcurrency(),
        attempts: getPublishAttempts(),
        backoffDelayMs: getBackoffDelay(),
      },
    };
  }

  const pubQ = getPublishingQueue();
  const schedQ = schedulerQueue || createSchedulerQueue();

  let pubJobCounts = { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0 };
  let schedJobCounts = { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0 };
  let redisConnected = false;

  try {
    const client = await pubQ.client;
    const pingRes = await client.ping();
    redisConnected = pingRes === "PONG";

    pubJobCounts = await pubQ.getJobCounts("waiting", "active", "delayed", "completed", "failed");
    schedJobCounts = await schedQ.getJobCounts("waiting", "active", "delayed", "completed", "failed");
  } catch (err) {
    console.error("Queue health check error:", err.message || err);
  }

  return {
    enabled: true,
    status: redisConnected ? "healthy" : "unhealthy",
    redis: {
      host: conn.host,
      port: conn.port,
      connected: redisConnected,
    },
    publishingQueue: {
      name: pubQ.name,
      counts: pubJobCounts,
    },
    schedulerQueue: {
      name: schedQ.name,
      counts: schedJobCounts,
    },
    config: {
      recoveryEnabled: isRecoveryEnabled(),
      recoveryPattern: getSchedulerPattern(),
      concurrency: getWorkerConcurrency(),
      attempts: getPublishAttempts(),
      backoffDelayMs: getBackoffDelay(),
    },
  };
};

exports.getFailedJobs = async ({ limit = 50 } = {}) => {
  if (!isEnabled()) {
    return [];
  }

  try {
    const pubQ = getPublishingQueue();
    const failedJobs = await pubQ.getFailed(0, limit - 1);

    return failedJobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
    }));
  } catch (err) {
    console.error("Failed to retrieve queue failed jobs:", err.message || err);
    return [];
  }
};

exports.stop = async () => {

  await Promise.all([
    schedulerWorker?.close(),
    publishingWorker?.close(),
    schedulerQueue?.close(),
    publishingQueue?.close(),
  ]);

  schedulerWorker = null;
  publishingWorker = null;
  schedulerQueue = null;
  publishingQueue = null;

  console.log("Scheduled posts queue stopped");
};

exports._private = {
  getBackoffDelay,
  getConnection,
  getPublishAttempts,
  getQueueName,
  getSchedulerPattern,
  getWorkerConcurrency,
  isRecoveryEnabled,
  isEnabled,
  JOB_NAMES,
};
