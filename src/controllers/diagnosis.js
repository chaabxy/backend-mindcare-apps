const prisma = require("../config/database");
const CertaintyFactorService = require("../services/certainty-factor");

const DiagnosisController = {
  async startDiagnosis(request, h) {
    try {
      const { nama, noWhatsapp, umur, jenisKelamin } = request.payload;

      console.log("=== START DIAGNOSIS REQUEST ===");
      console.log("Input data:", { nama, noWhatsapp, umur, jenisKelamin });

      // Validate required fields
      if (!nama || !noWhatsapp) {
        return h
          .response({
            success: false,
            message: "Nama dan nomor WhatsApp wajib diisi",
          })
          .code(400);
      }

      // Clean phone number format
      let cleanedPhone = noWhatsapp.replace(/\s+/g, "").replace(/[^\d+]/g, "");
      if (cleanedPhone.startsWith("0")) {
        cleanedPhone = "+62" + cleanedPhone.substring(1);
      } else if (cleanedPhone.startsWith("62")) {
        cleanedPhone = "+" + cleanedPhone;
      } else if (!cleanedPhone.startsWith("+62")) {
        cleanedPhone = "+62" + cleanedPhone;
      }

      console.log("Cleaned phone number:", cleanedPhone);

      // Always create new user for each diagnosis session
      // This ensures we don't accidentally delete existing users
      console.log("Creating new user for this diagnosis session...");
      const user = await prisma.user.create({
        data: {
          nama,
          noWhatsapp: cleanedPhone,
          umur: umur ? Number.parseInt(umur) : null,
          jenisKelamin,
        },
      });
      console.log("New user created:", user.id);

      // Create new diagnosis
      console.log("Creating new diagnosis...");
      const diagnosis = await prisma.diagnosis.create({
        data: {
          userId: user.id,
          status: "processing",
        },
      });

      console.log("Diagnosis created:", diagnosis.id);

      return h
        .response({
          success: true,
          data: {
            diagnosisId: diagnosis.id,
            userId: user.id,
            user: user,
          },
        })
        .code(201);
    } catch (error) {
      console.error("=== START DIAGNOSIS ERROR ===");
      console.error("Error:", error);
      console.error("Stack:", error.stack);

      return h
        .response({
          success: false,
          message: "Gagal memulai diagnosis: " + error.message,
        })
        .code(500);
    }
  },

  async submitSymptoms(request, h) {
    const startTime = Date.now();
    console.log("=== DIAGNOSIS START ===", new Date().toISOString());

    try {
      const { diagnosisId, gejalaInputs } = request.payload;
      console.log(`⏱️ Step 1 - Request received: ${Date.now() - startTime}ms`);

      // Validate diagnosis exists
      const diagnosisStartTime = Date.now();
      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id: diagnosisId },
        include: {
          user: true,
          userGejalaInputs: {
            include: { gejala: true },
          },
        },
      });
      console.log(
        `⏱️ Step 2 - Diagnosis fetch: ${Date.now() - diagnosisStartTime}ms`
      );

      if (!diagnosis) {
        return h
          .response({
            success: false,
            message: "Diagnosis tidak ditemukan",
          })
          .code(404);
      }

      // Validate gejala
      const gejalaStartTime = Date.now();
      const newGejalaIds = [
        ...new Set(gejalaInputs.map((input) => input.gejalaId)),
      ];
      const existingGejala = await prisma.gejala.findMany({
        where: { id: { in: newGejalaIds } },
        select: { id: true },
      });
      console.log(
        `⏱️ Step 3 - Gejala validation: ${Date.now() - gejalaStartTime}ms`
      );

      // Process inputs
      const processStartTime = Date.now();
      const validGejalaIds = new Set(existingGejala.map((g) => g.id));
      const existingGejalaIds = new Set(
        diagnosis.userGejalaInputs.map((input) => input.gejalaId)
      );

      const newInputsToAdd = [];
      const updatedInputs = [];
      const processedGejalaIds = new Set();

      for (const input of gejalaInputs) {
        if (!validGejalaIds.has(input.gejalaId)) continue;
        if (processedGejalaIds.has(input.gejalaId)) continue;

        processedGejalaIds.add(input.gejalaId);

        if (existingGejalaIds.has(input.gejalaId)) {
          updatedInputs.push({
            gejalaId: input.gejalaId,
            cfUser: Number.parseFloat(input.cfUser),
          });
        } else {
          newInputsToAdd.push({
            diagnosisId,
            gejalaId: input.gejalaId,
            cfUser: Number.parseFloat(input.cfUser),
          });
        }
      }
      console.log(
        `⏱️ Step 4 - Input processing: ${Date.now() - processStartTime}ms`
      );

      // Database operations
      const dbStartTime = Date.now();
      if (newInputsToAdd.length > 0) {
        await prisma.userGejalaInput.createMany({
          data: newInputsToAdd,
          skipDuplicates: true,
        });
      }

      for (const updateInput of updatedInputs) {
        await prisma.userGejalaInput.updateMany({
          where: {
            diagnosisId: diagnosisId,
            gejalaId: updateInput.gejalaId,
          },
          data: { cfUser: updateInput.cfUser },
        });
      }
      console.log(
        `⏱️ Step 5 - Database operations: ${Date.now() - dbStartTime}ms`
      );

      // Get current inputs and rules
      const dataFetchStartTime = Date.now();
      const [allCurrentInputs, rules] = await Promise.all([
        prisma.userGejalaInput.findMany({
          where: { diagnosisId },
          include: { gejala: true },
        }),
        prisma.rule.findMany({
          include: {
            penyakit: true,
            gejala: true,
          },
        }),
      ]);
      console.log(
        `⏱️ Step 6 - Data fetch: ${Date.now() - dataFetchStartTime}ms`
      );

      // CF Calculation
      const cfStartTime = Date.now();
      const inputsForCalculation = allCurrentInputs.map((input) => ({
        gejalaId: input.gejalaId,
        cfUser: input.cfUser,
      }));

      const calculationResult = await CertaintyFactorService.calculateDiagnosis(
        inputsForCalculation,
        rules
      );
      console.log(`⏱️ Step 7 - CF Calculation: ${Date.now() - cfStartTime}ms`);

      // Update diagnosis
      const updateStartTime = Date.now();
      let finalDiagnosis = null;
      if (
        calculationResult.bestDiagnosis &&
        calculationResult.bestDiagnosis.cfValue > 0
      ) {
        const penyakit = await prisma.penyakit.findUnique({
          where: { id: calculationResult.bestDiagnosis.penyakitId },
        });

        finalDiagnosis = await prisma.diagnosis.update({
          where: { id: diagnosisId },
          data: {
            penyakitId: calculationResult.bestDiagnosis.penyakitId,
            cfResult: calculationResult.bestDiagnosis.cfValue,
            persentase: calculationResult.bestDiagnosis.percentage,
            status: "completed",
          },
          include: {
            penyakit: true,
            user: true,
            userGejalaInputs: {
              include: { gejala: true },
            },
          },
        });
      } else {
        finalDiagnosis = await prisma.diagnosis.update({
          where: { id: diagnosisId },
          data: { status: "completed" },
          include: {
            user: true,
            userGejalaInputs: {
              include: { gejala: true },
            },
          },
        });
      }
      console.log(
        `⏱️ Step 8 - Final update: ${Date.now() - updateStartTime}ms`
      );

      const totalTime = Date.now() - startTime;
      console.log(`🎯 TOTAL DIAGNOSIS TIME: ${totalTime}ms`);

      return h
        .response({
          success: true,
          data: {
            diagnosis: finalDiagnosis,
            calculationDetails: calculationResult,
          },
        })
        .code(200);
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ DIAGNOSIS ERROR after ${totalTime}ms:`, error);

      return h
        .response({
          success: false,
          message: "Gagal memproses gejala: " + error.message,
        })
        .code(500);
    }
  },

  async getGejalaList(request, h) {
    try {
      console.log("=== GET GEJALA LIST ===");

      const gejalaList = await prisma.gejala.findMany({
        orderBy: { kode: "asc" },
      });

      console.log("Found", gejalaList.length, "gejala items");

      return h
        .response({
          success: true,
          data: gejalaList,
        })
        .code(200);
    } catch (error) {
      console.error("Get gejala list error:", error);
      return h
        .response({
          success: false,
          message: "Gagal mengambil data gejala: " + error.message,
        })
        .code(500);
    }
  },

  // Add method to check users
  async getAllUsers(request, h) {
    try {
      const users = await prisma.user.findMany({
        include: {
          diagnoses: {
            include: {
              penyakit: true,
              userGejalaInputs: {
                include: {
                  gejala: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return h
        .response({
          success: true,
          data: users,
        })
        .code(200);
    } catch (error) {
      console.error("Get users error:", error);
      return h
        .response({
          success: false,
          message: "Gagal mengambil data users",
        })
        .code(500);
    }
  },

  // Modified cleanup to only remove truly orphaned data
  async cleanupData(request, h) {
    try {
      console.log("=== CLEANUP DATA ===");

      // Only clean up orphaned user gejala inputs (where diagnosis doesn't exist)
      const existingDiagnosisIds = await prisma.diagnosis.findMany({
        select: { id: true },
      });
      const validDiagnosisIds = existingDiagnosisIds.map((d) => d.id);

      const orphanedInputs = await prisma.userGejalaInput.deleteMany({
        where: {
          diagnosisId: {
            notIn: validDiagnosisIds,
          },
        },
      });

      // Only clean up very old processing diagnoses (older than 7 days, not 24 hours)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const veryStaleProcessing = await prisma.diagnosis.deleteMany({
        where: {
          status: "processing",
          createdAt: {
            lt: sevenDaysAgo,
          },
        },
      });

      // NEVER delete users - they should remain for historical data
      console.log("Cleanup completed - Users are preserved");

      console.log("Cleaned up:", {
        orphanedInputs: orphanedInputs.count,
        veryStaleProcessing: veryStaleProcessing.count,
        usersDeleted: 0, // Never delete users
      });

      return h
        .response({
          success: true,
          data: {
            orphanedInputs: orphanedInputs.count,
            veryStaleProcessing: veryStaleProcessing.count,
            usersDeleted: 0,
          },
        })
        .code(200);
    } catch (error) {
      console.error("Cleanup error:", error);
      return h
        .response({
          success: false,
          message: "Gagal cleanup data",
        })
        .code(500);
    }
  },

  // Add method to get diagnosis by ID for debugging
  async getDiagnosisById(request, h) {
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
      console.error("Get diagnosis error:", error);
      return h
        .response({
          success: false,
          message: "Gagal mengambil data diagnosis",
        })
        .code(500);
    }
  },

  // Add method to get user's diagnosis history
  async getUserDiagnoses(request, h) {
    try {
      const { userId } = request.params;

      const diagnoses = await prisma.diagnosis.findMany({
        where: { userId },
        include: {
          penyakit: true,
          userGejalaInputs: {
            include: {
              gejala: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return h
        .response({
          success: true,
          data: diagnoses,
        })
        .code(200);
    } catch (error) {
      console.error("Get user diagnoses error:", error);
      return h
        .response({
          success: false,
          message: "Gagal mengambil riwayat diagnosis",
        })
        .code(500);
    }
  },
};

module.exports = DiagnosisController;
