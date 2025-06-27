const Hapi = require("@hapi/hapi");

// Import routes
const authRoutes = require("../routes/auth");
const dashboardRoutes = require("../routes/dashboard");
const pengecekanUserRoutes = require("../routes/pengecekan-user");
const dataPakarRoutes = require("../routes/data-pakar");
const diagnosisRoutes = require("../routes/diagnosis");

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3001,
    host: "0.0.0.0",
    routes: {
      cors: {
        origin: ["*"],
        headers: ["Accept", "Authorization", "Content-Type", "If-None-Match"],
        additionalHeaders: ["cache-control", "x-requested-with"],
        credentials: true,
      },
    },
  });

  // Health check
  server.route({
    method: "GET",
    path: "/health",
    handler: (request, h) => {
      return {
        status: "OK",
        timestamp: new Date().toISOString(),
      };
    },
  });

  // Register routes
  server.route(authRoutes);
  server.route(dashboardRoutes);
  server.route(pengecekanUserRoutes);
  server.route(dataPakarRoutes);
  server.route(diagnosisRoutes);

  await server.start();
  console.log("Server running on:", server.info.uri);
};

module.exports = { init };
