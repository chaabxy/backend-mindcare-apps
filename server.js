require("dotenv").config();
const { init } = require("./src/config/server");

// Log environment info for debugging
console.log("=== Environment Configuration ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("HOST:", process.env.HOST);
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not Set");
console.log("=====================================");

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

init();
