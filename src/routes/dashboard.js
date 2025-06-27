const DashboardController = require("../controllers/dashboard");

const dashboardRoutes = [
  {
    method: "GET",
    path: "/api/dashboard/stats",
    handler: DashboardController.getStats,
  },
  {
    method: "GET",
    path: "/api/health",
    handler: DashboardController.healthCheck,
  },
];

module.exports = dashboardRoutes;
