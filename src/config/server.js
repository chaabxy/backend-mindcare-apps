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
    },
  });

  // Global error handling
  server.ext("onPreResponse", (request, h) => {
    const response = request.response;

    if (response.isBoom) {
      console.error("Server Error:", response.message);
      console.error("Stack:", response.stack);

      // Don't crash the server, return error response
      return h
        .response({
          success: false,
          message: response.message || "Internal Server Error",
          statusCode: response.output.statusCode,
        })
        .code(response.output.statusCode);
    }

    return h.continue;
  });

  // Log request errors
  server.events.on("request", (request, event, tags) => {
    if (tags.error) {
      console.error("Request error:", event.error);
    }
  });

  // Log response info
  server.events.on("response", (request) => {
    console.log(
      `${request.info.remoteAddress} - ${request.method.toUpperCase()} ${
        request.path
      } - ${request.response.statusCode}`
    );
  });

  // Add health check endpoint
  server.route({
    method: "GET",
    path: "/health",
    handler: (request, h) => {
      return h
        .response({
          status: "OK",
          timestamp: new Date().toISOString(),
          env: {
            NODE_ENV: process.env.NODE_ENV,
            DATABASE_URL: process.env.DATABASE_URL ? "Set" : "Missing",
            JWT_SECRET: process.env.JWT_SECRET ? "Set" : "Missing",
          },
        })
        .code(200);
    },
  });

  // Register all route groups
  server.route(authRoutes);
  server.route(dashboardRoutes);
  server.route(pengecekanUserRoutes);
  server.route(dataPakarRoutes);
  server.route(diagnosisRoutes);

  // Start the server
  await server.start();

  // Display server info
  console.log("✅ Server running on:", server.info.uri);
  console.log("✅ CORS enabled for all origins");
  console.log("✅ Environment:", process.env.NODE_ENV || "development");

  // Show all registered API endpoints
  console.log("\n📋 Available API Endpoints:");
  server.table().forEach((route) => {
    console.log(`${route.method.toUpperCase()} ${route.path}`);
  });
};

module.exports = { init };
