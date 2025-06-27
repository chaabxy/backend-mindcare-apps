const DashboardController = require("../controllers/dashboard");
const prisma = require("../config/database");

const dashboardRoutes = [
  {
    method: "GET",
    path: "/api/dashboard/stats",
    handler: DashboardController.getStats,
  },
  {
    method: "GET",
    path: "/api/health",
    handler: async (request, h) => {
      try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1`;
        return h
          .response({
            success: true,
            message: "Server and database are healthy",
            timestamp: new Date().toISOString(),
          })
          .code(200);
      } catch (error) {
        console.error("Health check failed:", error);
        return h
          .response({
            success: false,
            message: "Database connection failed",
            error: error.message,
          })
          .code(500);
      }
    },
  },
  {
    method: "GET",
    path: "/api/debug/dashboard",
    handler: async (request, h) => {
      try {
        console.log("=== DEBUG DASHBOARD ===");

        // Test each query individually
        const tests = {};

        try {
          tests.userCount = await prisma.user.count();
        } catch (e) {
          tests.userCount = { error: e.message };
        }

        try {
          tests.diagnosisCount = await prisma.diagnosis.count();
        } catch (e) {
          tests.diagnosisCount = { error: e.message };
        }

        try {
          tests.penyakitCount = await prisma.penyakit.count();
        } catch (e) {
          tests.penyakitCount = { error: e.message };
        }

        try {
          tests.gejalaCount = await prisma.gejala.count();
        } catch (e) {
          tests.gejalaCount = { error: e.message };
        }

        return h
          .response({
            success: true,
            data: tests,
            timestamp: new Date().toISOString(),
          })
          .code(200);
      } catch (error) {
        return h
          .response({
            success: false,
            message: "Debug failed",
            error: error.message,
          })
          .code(500);
      }
    },
  },
];

module.exports = dashboardRoutes;
