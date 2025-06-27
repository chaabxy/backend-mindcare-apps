const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Add transaction timeout configuration
  transactionOptions: {
    maxWait: 10000, // 10 seconds
    timeout: 15000, // 15 seconds
  },
});

// Add connection retry logic
let retryCount = 0;
const maxRetries = 3;

const connectWithRetry = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
    retryCount = 0;
  } catch (error) {
    retryCount++;
    console.error(
      `❌ Database connection failed (attempt ${retryCount}/${maxRetries}):`,
      error.message
    );

    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying database connection in 5 seconds...`);
      setTimeout(connectWithRetry, 5000);
    } else {
      console.error("💥 Max database connection retries reached");
      throw error;
    }
  }
};

// Initial connection
connectWithRetry();

// Handle graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
