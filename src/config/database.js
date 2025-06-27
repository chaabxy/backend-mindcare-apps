const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // REVERT: Use safer transaction timeout
  transactionOptions: {
    maxWait: 10000, // Back to 10 seconds
    timeout: 20000, // Back to 20 seconds
  },
  // REVERT: Use safer connection settings
  __internal: {
    engine: {
      connectTimeout: 10000, // Back to 10 seconds
      pool_timeout: 10000, // Back to 10 seconds
    },
  },
});

// Test connection on startup with retry
const connectWithRetry = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log("✅ Database connected successfully");
      return;
    } catch (error) {
      console.error(
        `❌ Database connection attempt ${i + 1} failed:`,
        error.message
      );
      if (i === retries - 1) {
        console.error("❌ All database connection attempts failed");
        throw error;
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
};

// Initialize connection
connectWithRetry().catch((error) => {
  console.error("❌ Database connection failed:", error);
});

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
