const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Add connection pooling and timeout settings
  __internal: {
    engine: {
      connectTimeout: 60000,
      pool_timeout: 60000,
    },
  },
});

// Simple connection test without crashing the app
const testConnection = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    // Don't exit the process, let the app handle it gracefully
  }
};

// Test connection on startup
testConnection();

// Handle graceful shutdown
const gracefulShutdown = async () => {
  try {
    await prisma.$disconnect();
    console.log("Database disconnected");
  } catch (error) {
    console.error("Error disconnecting database:", error);
  }
};

process.on("beforeExit", gracefulShutdown);
process.on("SIGINT", async () => {
  await gracefulShutdown();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await gracefulShutdown();
  process.exit(0);
});

module.exports = prisma;
