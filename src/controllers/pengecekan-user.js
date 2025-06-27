const { prisma } = require("../config/database");
const ExcelExportService = require("../services/excel-export");

const PengecekanUserController = {
  async getAllDiagnoses(request, h) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        penyakitId = "",
      } = request.query;

      const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);
      const take = Number.parseInt(limit);

      const where = {
        status: "completed",
        ...(search && {
          user: {
            nama: {
              contains: search,
              mode: "insensitive",
            },
          },
        }),
        ...(penyakitId && { penyakitId }),
      };

      const [diagnoses, total] = await Promise.all([
        prisma.diagnosis.findMany({
          where,
          include: {
            user: true,
            penyakit: true,
            userGejalaInputs: {
              include: {
                gejala: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.diagnosis.count({ where }),
      ]);

      return h
        .response({
          success: true,
          data: {
            diagnoses,
            pagination: {
              page: Number.parseInt(page),
              limit: Number.parseInt(limit),
              total,
              totalPages: Math.ceil(total / Number.parseInt(limit)),
            },
          },
        })
        .code(200);
    } catch (error) {
      console.error("Get diagnoses error:", error);
      return h
        .response({
          success: false,
          message: "Gagal mengambil data diagnosis",
        })
        .code(500);
    }
  },

  async getDiagnosisDetail(request, h) {
    try {
      const { id } = request.params;

      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id },
        include: {
          user: true,
          penyakit: true,
          userGejalaInputs: {
            include: {
              gejala: true,
            },
          },
        },
      });

      if (!diagnosis) {
        return h
          .response({
            success: false,
            message: "Diagnosis tidak ditemukan",
          })
          .code(404);
      }

      return h
        .response({
          success: true,
          data: diagnosis,
        })
        .code(200);
    } catch (error) {
      console.error("Get diagnosis detail error:", error);
      return h
        .response({
          success: false,
          message: "Gagal mengambil detail diagnosis",
        })
        .code(500);
    }
  },

  async exportDiagnoses(request, h) {
    try {
      const diagnoses = await prisma.diagnosis.findMany({
        where: { status: "completed" },
        include: {
          user: true,
          penyakit: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const workbook = await ExcelExportService.exportDiagnosisData(diagnoses);
      const buffer = await workbook.xlsx.writeBuffer();

      return h
        .response(buffer)
        .header(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        .header(
          "Content-Disposition",
          `attachment; filename="data-diagnosis-${
            new Date().toISOString().split("T")[0]
          }.xlsx"`
        )
        .code(200);
    } catch (error) {
      console.error("Export diagnoses error:", error);
      return h
        .response({
          success: false,
          message: "Gagal export data diagnosis",
        })
        .code(500);
    }
  },

  async deleteDiagnosis(request, h) {
    try {
      const { id } = request.params;

      await prisma.diagnosis.delete({
        where: { id },
      });

      return h
        .response({
          success: true,
          message: "Diagnosis berhasil dihapus",
        })
        .code(200);
    } catch (error) {
      console.error("Delete diagnosis error:", error);
      return h
        .response({
          success: false,
          message: "Gagal menghapus diagnosis",
        })
        .code(500);
    }
  },
};

module.exports = PengecekanUserController;
