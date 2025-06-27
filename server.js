require("dotenv").config();
const { init } = require("./src/config/server");
const { testDatabaseConnection } = require("./src/config/database");

// Log environment info for debugging
console.log("=== Environment Configuration ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("HOST:", process.env.HOST);
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not Set");

if (process.env.DATABASE_URL) {
  // Mask sensitive parts of the URL for logging
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":****@");
  console.log("DATABASE_URL (masked):", maskedUrl);
}

console.log("=====================================");

// Enhanced error handling
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  console.error("Stack:", err.stack);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  console.error("Stack:", err.stack);
  process.exit(1);
});

// Initialize server with database connection test
async function startServer() {
  try {
    // Test database connection first
    console.log("Testing database connection before starting server...");
    const dbConnected = await testDatabaseConnection();

    if (!dbConnected) {
      console.error("❌ Cannot start server: Database connection failed");
      console.error("Please check your DATABASE_URL and database status");
      process.exit(1);
    }

    // Start the server
    await init();
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
