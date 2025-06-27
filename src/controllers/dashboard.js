const { prisma } = require("../config/database");

const DashboardController = {
  async getStats(request, h) {
    try {
      console.log("=== DASHBOARD STATS REQUEST ===");
      console.log("Request received at:", new Date().toISOString());

      // Optional: Verify session if token provided
      const sessionToken =
        request.headers["x-session-token"] || request.query.sessionToken;

      if (sessionToken) {
        console.log(
          "Session token provided:",
          sessionToken.substring(0, 10) + "..."
        );
        // You can add session verification here if needed
      }

      const totalUsers = await prisma.user.count();
      console.log("Total users:", totalUsers);

      const totalDiagnoses = await prisma.diagnosis.count({
        where: { status: "completed" },
      });
      console.log("Total diagnoses:", totalDiagnoses);

      const diagnosisThisMonth = await prisma.diagnosis.count({
        where: {
          status: "completed",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      });
      console.log("Diagnosis this month:", diagnosisThisMonth);

      const diagnosisByPenyakit = await prisma.diagnosis.groupBy({
        by: ["penyakitId"],
        where: {
          status: "completed",
          penyakitId: { not: null },
        },
        _count: {
          id: true,
        },
      });
      console.log("Diagnosis by penyakit groups:", diagnosisByPenyakit.length);

      const penyakitStats = await Promise.all(
        diagnosisByPenyakit.map(async (item) => {
          const penyakit = await prisma.penyakit.findUnique({
            where: { id: item.penyakitId },
          });
          return {
            penyakit: penyakit?.nama || "Unknown",
            count: item._count.id,
          };
        })
      );

      // Get recent diagnoses with better error handling
      const recentDiagnoses = await prisma.diagnosis.findMany({
        where: { status: "completed" },
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              noWhatsapp: true,
              umur: true,
              jenisKelamin: true,
            },
          },
          penyakit: {
            select: {
              id: true,
              nama: true,
              kode: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      console.log("Recent diagnoses:", recentDiagnoses.length);

      const responseData = {
        totalUsers,
        totalDiagnoses,
        diagnosisThisMonth,
        penyakitStats,
        recentDiagnoses,
        timestamp: new Date().toISOString(),
      };

      console.log("✅ Dashboard stats response prepared successfully");

      return h
        .response({
          success: true,
          data: responseData,
        })
        .code(200);
    } catch (error) {
      console.error("=== DASHBOARD STATS ERROR ===");
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("Error code:", error.code);

      // Handle specific database errors
      if (error.code === "P2028") {
        return h
          .response({
            success: false,
            message: "Database timeout. Silakan coba lagi.",
            error: "TIMEOUT",
          })
          .code(500);
      }

      if (error.code?.startsWith("P")) {
        return h
          .response({
            success: false,
            message: "Database error. Silakan coba lagi.",
            error: "DATABASE_ERROR",
          })
          .code(500);
      }

      return h
        .response({
          success: false,
          message: "Gagal mengambil data dashboard: " + error.message,
          error: "INTERNAL_ERROR",
        })
        .code(500);
    }
  },

  // Health check endpoint
  async healthCheck(request, h) {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;

      return h
        .response({
          success: true,
          data: {
            status: "healthy",
            database: "connected",
            timestamp: new Date().toISOString(),
          },
        })
        .code(200);
    } catch (error) {
      console.error("Health check failed:", error);
      return h
        .response({
          success: false,
          data: {
            status: "unhealthy",
            database: "disconnected",
            error: error.message,
            timestamp: new Date().toISOString(),
          },
        })
        .code(500);
    }
  },
};

module.exports = DashboardController;
