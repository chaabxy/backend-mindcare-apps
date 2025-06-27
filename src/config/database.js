const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Production-friendly settings
  transactionOptions: {
    maxWait: 20000, // 20 seconds
    timeout: 30000, // 30 seconds
  },
});

// Test connection on startup with retry
const connectWithRetry = async (retries = 5) => {
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
      // Wait before retry (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
};

// Initialize connection
connectWithRetry().catch((error) => {
  console.error("❌ Database connection failed:", error);
  process.exit(1);
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
