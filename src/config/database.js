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
    maxWait: 3000, // Reduce to 3 seconds
    timeout: 8000, // Reduce to 8 seconds
  },
  // Add connection pool settings
  __internal: {
    engine: {
      connectTimeout: 5000, // 5 seconds connection timeout
      pool_timeout: 5000, // 5 seconds pool timeout
    },
  },
});

// Test connection on startup
prisma
  .$connect()
  .then(() => {
    console.log("✅ Database connected successfully");
  })
  .catch((error) => {
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
