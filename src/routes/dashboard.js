const DashboardController = require("../controllers/dashboard");
const authMiddleware = require("../middleware/auth");

const dashboardRoutes = [
  {
    method: "GET",
    path: "/api/dashboard/stats",
    handler: DashboardController.getStats,
    options: {
      pre: [{ method: authMiddleware }],
      timeout: {
        server: 10000, // 10 seconds timeout for dashboard
      },
    },
  },
];

module.exports = dashboardRoutes;
