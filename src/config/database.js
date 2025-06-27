const { PrismaClient } = require("@prisma/client");

// Enhanced database configuration with better error handling
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Enhanced connection configuration for Neon
  transactionOptions: {
    maxWait: 10000, // 10 seconds
    timeout: 20000, // 20 seconds
  },
  // Add connection pool settings for better stability
  __internal: {
    engine: {
      connectTimeout: 60000, // 60 seconds
      pool: {
        timeout: 60000,
      },
    },
  },
});

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    console.log("=== TESTING DATABASE CONNECTION ===");
    console.log(
      "DATABASE_URL configured:",
      process.env.DATABASE_URL ? "Yes" : "No"
    );

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // Test basic connection
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // Test query execution
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("✅ Database query test successful:", result);

    return true;
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);

    if (error.message.includes("Can't reach database server")) {
      console.error("🔍 Troubleshooting tips:");
      console.error("1. Check if DATABASE_URL is correct in .env file");
      console.error("2. Verify Neon database is active (not suspended)");
      console.error("3. Check internet connection");
      console.error("4. Verify database credentials");
    }

    return false;
  }
}

// Enhanced graceful shutdown
async function gracefulShutdown() {
  try {
    console.log("Disconnecting from database...");
    await prisma.$disconnect();
    console.log("Database disconnected successfully");
  } catch (error) {
    console.error("Error during database disconnect:", error);
  }
}

// Handle graceful shutdown
process.on("beforeExit", gracefulShutdown);
process.on("SIGINT", async () => {
  await gracefulShutdown();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await gracefulShutdown();
  process.exit(0);
});

// Export both prisma client and test function
module.exports = { prisma, testDatabaseConnection };
