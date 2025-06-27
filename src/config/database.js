const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "production"
      ? ["error"]
      : ["query", "info", "warn", "error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // OPTIMIZED transaction settings
  transactionOptions: {
    maxWait: 10000, // 10 seconds
    timeout: 30000, // 30 seconds
  },
});

// Add connection pooling optimization
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
  console.log("🔄 Gracefully shutting down database connection...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🔄 Gracefully shutting down database connection...");
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
