const Hapi = require("@hapi/hapi");
const Joi = require("joi");
const Boom = require("@hapi/boom");

// Import routes
const authRoutes = require("../routes/auth");
const dashboardRoutes = require("../routes/dashboard");
const pengecekanUserRoutes = require("../routes/pengecekan-user");
const dataPakarRoutes = require("../routes/data-pakar");
const diagnosisRoutes = require("../routes/diagnosis");

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3001,
    host:
      process.env.NODE_ENV === "production"
        ? "0.0.0.0"
        : process.env.HOST || "localhost",
    routes: {
      cors: {
        origin:
          process.env.NODE_ENV === "production"
            ? [
                "https://mind-care-apps-qcto94qiw-chacanisya48-gmailcoms-projects.vercel.app",
              ]
            : ["*"], // Allow all origins in development
        headers: [
          "Accept",
          "Authorization",
          "Content-Type",
          "If-None-Match",
          "Origin",
        ],
        additionalHeaders: ["cache-control", "x-requested-with"],
        credentials: true,
      },
      validate: {
        failAction: async (request, h, err) => {
          console.error("Validation Error:", err.message);
          if (process.env.NODE_ENV === "production") {
            throw Boom.badRequest("Invalid request payload input");
          } else {
            console.error("Full validation error:", err);
            throw err;
          }
        },
      },
    },
  });

  // Enhanced error logging
  server.events.on("request", (request, event, tags) => {
    if (tags.error) {
      console.error("Request error:", {
        error: event.error?.message || event.error,
        stack: event.error?.stack,
        url: request.url,
        method: request.method,
        payload: request.payload,
      });
    }
  });

  // Enhanced response logging
  server.events.on("response", (request) => {
    const logData = {
      timestamp: new Date().toISOString(),
      ip: request.info.remoteAddress,
      method: request.method.toUpperCase(),
      path: request.path,
      statusCode: request.response.statusCode,
      responseTime: Date.now() - request.info.received,
    };

    if (request.response.statusCode >= 400) {
      console.error("Error Response:", logData);
    } else {
      console.log(
        "Request:",
        `${logData.method} ${logData.path} - ${logData.statusCode} (${logData.responseTime}ms)`
      );
    }
  });

  // Register all route groups
  try {
    server.route(authRoutes);
    server.route(dashboardRoutes);
    server.route(pengecekanUserRoutes);
    server.route(dataPakarRoutes);
    server.route(diagnosisRoutes);
    console.log("All routes registered successfully");
  } catch (error) {
    console.error("Error registering routes:", error);
    throw error;
  }

  // Start the server
  try {
    await server.start();
    console.log("=== SERVER STARTED ===");
    console.log("Server running on:", server.info.uri);
    console.log("Environment:", process.env.NODE_ENV || "development");
    console.log("CORS enabled for all origins");

    // Show all registered API endpoints
    console.log("\n=== Available API Endpoints ===");
    server.table().forEach((route) => {
      console.log(`${route.method.toUpperCase()} ${route.path}`);
    });
    console.log("===============================");
  } catch (error) {
    console.error("Failed to start server:", error);
    throw error;
  }
};

module.exports = { init };
