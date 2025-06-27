const prisma = require("../config/database");

const DashboardController = {
  async getStats(request, h) {
    try {
      console.log(
        "[DASHBOARD] Getting stats for user:",
        request.auth?.admin?.username
      );

      const totalUsers = await prisma.user.count();
      const totalDiagnoses = await prisma.diagnosis.count({
        where: { status: "completed" },
      });

      const diagnosisThisMonth = await prisma.diagnosis.count({
        where: {
          status: "completed",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      });

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

      // Get recent diagnoses
      const recentDiagnoses = await prisma.diagnosis.findMany({
        where: { status: "completed" },
        include: {
          user: true,
          penyakit: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      console.log("[DASHBOARD] Stats retrieved successfully");

      return h
        .response({
          success: true,
          data: {
            totalUsers,
            totalDiagnoses,
            diagnosisThisMonth,
            penyakitStats,
            recentDiagnoses,
          },
        })
        .code(200);
    } catch (error) {
      console.error("[DASHBOARD] Stats error:", error);

      if (error.message === "Database query timeout") {
        return h
          .response({
            success: false,
            message: "Request timeout - silakan coba lagi",
            code: "TIMEOUT",
          })
          .code(408);
      }

      return h
        .response({
          success: false,
          message: "Gagal mengambil data dashboard",
          code: "DASHBOARD_ERROR",
        })
        .code(500);
    }
  },
};

module.exports = DashboardController;
