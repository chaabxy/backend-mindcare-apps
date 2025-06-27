const DashboardController = require("../controllers/dashboard")

const dashboardRoutes = [
  {
    method: "GET",
    path: "/api/dashboard/stats",
    handler: DashboardController.getStats,
  },
]

module.exports = dashboardRoutes
