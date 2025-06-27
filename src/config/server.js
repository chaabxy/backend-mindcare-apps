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
    host: process.env.HOST || "0.0.0.0",
    routes: {
      cors: {
        origin: ["*"],
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
    // Add state configuration for cookies
    state: {
      strictHeader: false,
      ignoreErrors: true,
      isSecure: process.env.NODE_ENV === "production",
      isSameSite: "Lax",
    },
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

  // Register all route groups
  server.route(authRoutes);
  server.route(dashboardRoutes);
  server.route(pengecekanUserRoutes);
  server.route(dataPakarRoutes);
  server.route(diagnosisRoutes);

  // Start the server
  await server.start();

  // Display server info
  console.log("Server running on:", server.info.uri);
  console.log("CORS enabled for all origins");
  console.log("Session-based authentication enabled");

  // Show all registered API endpoints
  console.log("\nAvailable API Endpoints:");
  server.table().forEach((route) => {
    console.log(`${route.method.toUpperCase()} ${route.path}`);
  });
};

module.exports = { init };
