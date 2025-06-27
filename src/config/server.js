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
    host: process.env.HOST || "0.0.0.0", // Use 0.0.0.0 for universal access
    routes: {
      cors: {
        origin: ["*"], // Allow all origins (development only)
        headers: ["Accept", "Authorization", "Content-Type", "If-None-Match"],
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
      timeout: {
        server: 30000, // 30 seconds server timeout
        socket: 35000, // 35 seconds socket timeout
      },
    },
  });

  // Add request lifecycle logging
  server.ext("onRequest", (request, h) => {
    console.log(
      `[${new Date().toISOString()}] ${request.method.toUpperCase()} ${
        request.path
      }`
    );
    return h.continue;
  });

  // Add response lifecycle logging
  server.ext("onPreResponse", (request, h) => {
    const response = request.response;

    if (response.isBoom) {
      console.error(
        `[${new Date().toISOString()}] ERROR ${request.method.toUpperCase()} ${
          request.path
        } - ${response.output.statusCode}: ${response.message}`
      );
    } else {
      console.log(
        `[${new Date().toISOString()}] ${request.method.toUpperCase()} ${
          request.path
        } - ${response.statusCode}`
      );
    }

    return h.continue;
  });

  // Handle server errors
  server.events.on("request", (request, event, tags) => {
    if (tags.error) {
      console.error(
        `[${new Date().toISOString()}] Request error:`,
        event.error
      );
    }
  });

  // Handle client disconnections
  server.events.on("disconnect", (request) => {
    console.log(
      `[${new Date().toISOString()}] Client disconnected: ${request.method.toUpperCase()} ${
        request.path
      }`
    );
  });

  // Register all route groups
  server.route(authRoutes);
  server.route(dashboardRoutes);
  server.route(pengecekanUserRoutes);
  server.route(dataPakarRoutes);
  server.route(diagnosisRoutes);

  // Add health check endpoint
  server.route({
    method: "GET",
    path: "/health",
    handler: (request, h) => {
      return h
        .response({
          status: "healthy",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        })
        .code(200);
    },
  });

  // Start the server
  await server.start();

  // Display server info
  console.log("=== SERVER STARTED ===");
  console.log("Server running on:", server.info.uri);
  console.log("CORS enabled for all origins");
  console.log("Environment:", process.env.NODE_ENV || "development");

  // Show all registered API endpoints
  console.log("\n=== AVAILABLE API ENDPOINTS ===");
  server.table().forEach((route) => {
    console.log(`${route.method.toUpperCase().padEnd(7)} ${route.path}`);
  });
  console.log("===============================\n");
};

module.exports = { init };
