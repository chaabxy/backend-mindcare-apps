const prisma = require("../config/database");
const CertaintyFactorService = require("../services/certainty-factor");

const DiagnosisController = {
  async startDiagnosis(request, h) {
    const startTime = Date.now();
    console.log("=== START DIAGNOSIS ===", new Date().toISOString());

    try {
      const { nama, noWhatsapp, umur, jenisKelamin } = request.payload;
      console.log(`⏱️ Step 1 - Request received: ${Date.now() - startTime}ms`);

      // Validate required fields
      if (!nama || !noWhatsapp) {
        return h
          .response({
            success: false,
            message: "Nama dan nomor WhatsApp wajib diisi",
          })
          .code(400);
      }

      // Clean phone number format (optimized)
      const phoneStartTime = Date.now();
      let cleanedPhone = noWhatsapp.replace(/\s+/g, "").replace(/[^\d+]/g, "");
      if (cleanedPhone.startsWith("0")) {
        cleanedPhone = "+62" + cleanedPhone.substring(1);
      } else if (cleanedPhone.startsWith("62")) {
        cleanedPhone = "+" + cleanedPhone;
      } else if (!cleanedPhone.startsWith("+62")) {
        cleanedPhone = "+62" + cleanedPhone;
      }
      console.log(
        `⏱️ Step 2 - Phone cleanup: ${Date.now() - phoneStartTime}ms`
      );

      // SUPER OPTIMIZED: Create user and diagnosis in a single transaction
      const transactionStartTime = Date.now();
      const result = await prisma.$transaction(
        async (tx) => {
          console.log(
            `  🔄 Transaction started: ${Date.now() - transactionStartTime}ms`
          );

          // Create user
          const userCreateStart = Date.now();
          const user = await tx.user.create({
            data: {
              nama,
              noWhatsapp: cleanedPhone,
              umur: umur ? Number.parseInt(umur) : null,
              jenisKelamin,
            },
            select: {
              id: true,
              nama: true,
              noWhatsapp: true,
              umur: true,
              jenisKelamin: true,
            },
          });
          console.log(`  👤 User created: ${Date.now() - userCreateStart}ms`);

          // Create diagnosis
          const diagnosisCreateStart = Date.now();
          const diagnosis = await tx.diagnosis.create({
            data: {
              userId: user.id,
              status: "processing",
            },
            select: {
              id: true,
              userId: true,
              status: true,
            },
          });
          console.log(
            `  📋 Diagnosis created: ${Date.now() - diagnosisCreateStart}ms`
          );

          return { user, diagnosis };
        },
        {
          maxWait: 3000, // 3 seconds max wait
          timeout: 5000, // 5 seconds timeout
        }
      );
      console.log(
        `⏱️ Step 3 - Database transaction: ${
          Date.now() - transactionStartTime
        }ms`
      );

      const totalTime = Date.now() - startTime;
      console.log(`🎯 START DIAGNOSIS TOTAL: ${totalTime}ms`);

      return h
        .response({
          success: true,
          data: {
            diagnosisId: result.diagnosis.id,
            userId: result.user.id,
            user: result.user,
          },
        })
        .code(201);
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ START DIAGNOSIS ERROR after ${totalTime}ms:`, error);

      // Handle specific database errors
      if (error.code === "P2028") {
        return h
          .response({
            success: false,
            message: "Database timeout - silakan coba lagi",
          })
          .code(500);
      }

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
    console.log("=== SUBMIT SYMPTOMS ===", new Date().toISOString());

    try {
      const { diagnosisId, gejalaInputs } = request.payload;
      console.log(`⏱️ Step 1 - Request received: ${Date.now() - startTime}ms`);
      console.log(`📊 Processing ${gejalaInputs.length} gejala inputs`);

      // Validate inputs first
      if (!diagnosisId || !gejalaInputs || gejalaInputs.length === 0) {
        return h
          .response({
            success: false,
            message: "Data diagnosis dan gejala wajib diisi",
          })
          .code(400);
      }

      // SUPER OPTIMIZED: Parallel data fetching with minimal fields
      const dataFetchStartTime = Date.now();
      const uniqueGejalaIds = [
        ...new Set(gejalaInputs.map((input) => input.gejalaId)),
      ];

      console.log(
        `  🔍 Fetching data for ${uniqueGejalaIds.length} unique gejala...`
      );

      const [diagnosis, existingGejala, rules] = await Promise.all([
        // Get diagnosis with existing inputs - MINIMAL FIELDS
        prisma.diagnosis.findUnique({
          where: { id: diagnosisId },
          select: {
            id: true,
            userId: true,
            status: true,
            user: {
              select: { id: true, nama: true, noWhatsapp: true },
            },
            userGejalaInputs: {
              select: { gejalaId: true, cfUser: true, id: true },
            },
          },
        }),
        // Get valid gejala IDs - MINIMAL FIELDS
        prisma.gejala.findMany({
          where: { id: { in: uniqueGejalaIds } },
          select: { id: true },
        }),
        // Get rules for calculation - MINIMAL FIELDS
        prisma.rule.findMany({
          select: {
            id: true,
            penyakitId: true,
            gejalaId: true,
            cfValue: true,
            penyakit: { select: { id: true, nama: true, kode: true } },
            gejala: { select: { id: true, nama: true, kode: true } },
          },
        }),
      ]);
      console.log(
        `⏱️ Step 2 - Parallel data fetch: ${Date.now() - dataFetchStartTime}ms`
      );

      if (!diagnosis) {
        return h
          .response({
            success: false,
            message: "Diagnosis tidak ditemukan",
          })
          .code(404);
      }

      // OPTIMIZED: Process inputs efficiently with Maps
      const processStartTime = Date.now();
      const validGejalaIds = new Set(existingGejala.map((g) => g.id));
      const existingGejalaMap = new Map(
        diagnosis.userGejalaInputs.map((input) => [input.gejalaId, input])
      );

      const newInputsToAdd = [];
      const inputsToUpdate = [];
      const processedGejalaIds = new Set();

      for (const input of gejalaInputs) {
        if (
          !validGejalaIds.has(input.gejalaId) ||
          processedGejalaIds.has(input.gejalaId)
        ) {
          continue;
        }

        processedGejalaIds.add(input.gejalaId);
        const cfUser = Number.parseFloat(input.cfUser);

        if (existingGejalaMap.has(input.gejalaId)) {
          const existingInput = existingGejalaMap.get(input.gejalaId);
          inputsToUpdate.push({
            id: existingInput.id,
            cfUser,
          });
        } else {
          newInputsToAdd.push({
            diagnosisId,
            gejalaId: input.gejalaId,
            cfUser,
          });
        }
      }

      console.log(
        `  📝 New inputs: ${newInputsToAdd.length}, Updates: ${inputsToUpdate.length}`
      );
      console.log(
        `⏱️ Step 3 - Input processing: ${Date.now() - processStartTime}ms`
      );

      // SUPER OPTIMIZED: Database operations in single transaction
      const dbStartTime = Date.now();
      const updatedInputs = await prisma.$transaction(
        async (tx) => {
          console.log(
            `  🔄 DB Transaction started: ${Date.now() - dbStartTime}ms`
          );

          // Batch create new inputs
          if (newInputsToAdd.length > 0) {
            const createStart = Date.now();
            await tx.userGejalaInput.createMany({
              data: newInputsToAdd,
              skipDuplicates: true,
            });
            console.log(
              `    ➕ Created ${newInputsToAdd.length} inputs: ${
                Date.now() - createStart
              }ms`
            );
          }

          // Batch update existing inputs
          if (inputsToUpdate.length > 0) {
            const updateStart = Date.now();
            await Promise.all(
              inputsToUpdate.map((input) =>
                tx.userGejalaInput.update({
                  where: { id: input.id },
                  data: { cfUser: input.cfUser },
                })
              )
            );
            console.log(
              `    🔄 Updated ${inputsToUpdate.length} inputs: ${
                Date.now() - updateStart
              }ms`
            );
          }

          // Get all current inputs for calculation - MINIMAL FIELDS
          const fetchStart = Date.now();
          const result = await tx.userGejalaInput.findMany({
            where: { diagnosisId },
            select: {
              gejalaId: true,
              cfUser: true,
              gejala: { select: { kode: true, nama: true } },
            },
          });
          console.log(
            `    📊 Fetched ${result.length} inputs: ${
              Date.now() - fetchStart
            }ms`
          );

          return result;
        },
        {
          maxWait: 3000, // 3 seconds max wait
          timeout: 8000, // 8 seconds timeout
        }
      );
      console.log(
        `⏱️ Step 4 - Database operations: ${Date.now() - dbStartTime}ms`
      );

      // OPTIMIZED: CF calculation
      const cfStartTime = Date.now();
      const inputsForCalculation = updatedInputs.map((input) => ({
        gejalaId: input.gejalaId,
        cfUser: input.cfUser,
      }));

      console.log(
        `  🧮 Calculating CF for ${inputsForCalculation.length} inputs against ${rules.length} rules`
      );
      const calculationResult = await CertaintyFactorService.calculateDiagnosis(
        inputsForCalculation,
        rules
      );
      console.log(`⏱️ Step 5 - CF Calculation: ${Date.now() - cfStartTime}ms`);

      // OPTIMIZED: Final update in single operation
      const updateStartTime = Date.now();
      let finalDiagnosis;

      if (
        calculationResult.bestDiagnosis &&
        calculationResult.bestDiagnosis.cfValue > 0
      ) {
        console.log(
          `  🎯 Best diagnosis found: ${calculationResult.bestDiagnosis.percentage}%`
        );
        finalDiagnosis = await prisma.diagnosis.update({
          where: { id: diagnosisId },
          data: {
            penyakitId: calculationResult.bestDiagnosis.penyakitId,
            cfResult: calculationResult.bestDiagnosis.cfValue,
            persentase: calculationResult.bestDiagnosis.percentage,
            status: "completed",
          },
          include: {
            penyakit: { select: { id: true, nama: true, kode: true } },
            user: { select: { id: true, nama: true, noWhatsapp: true } },
            userGejalaInputs: {
              include: {
                gejala: { select: { kode: true, nama: true } },
              },
            },
          },
        });
      } else {
        console.log(`  ❌ No diagnosis found`);
        finalDiagnosis = await prisma.diagnosis.update({
          where: { id: diagnosisId },
          data: { status: "completed" },
          include: {
            user: { select: { id: true, nama: true, noWhatsapp: true } },
            userGejalaInputs: {
              include: {
                gejala: { select: { kode: true, nama: true } },
              },
            },
          },
        });
      }
      console.log(
        `⏱️ Step 6 - Final update: ${Date.now() - updateStartTime}ms`
      );

      const totalTime = Date.now() - startTime;
      console.log(`🎯 SUBMIT SYMPTOMS TOTAL: ${totalTime}ms`);

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
      console.error(`❌ SUBMIT SYMPTOMS ERROR after ${totalTime}ms:`, error);

      // Handle specific Prisma errors
      if (error.code === "P2002") {
        return h
          .response({
            success: false,
            message: "Terjadi duplikasi data gejala. Silakan coba lagi.",
          })
          .code(400);
      }

      if (error.code === "P2028") {
        return h
          .response({
            success: false,
            message: "Database timeout. Silakan coba lagi.",
          })
          .code(500);
      }

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
      const startTime = Date.now();
      console.log("=== GET GEJALA LIST ===");

      // SUPER OPTIMIZED: Only get necessary fields
      const gejalaList = await prisma.gejala.findMany({
        select: {
          id: true,
          kode: true,
          nama: true,
          deskripsi: true,
          createdAt: true,
        },
        orderBy: { kode: "asc" },
      });

      const duration = Date.now() - startTime;
      console.log(
        `⏱️ Gejala list fetched in ${duration}ms - Found ${gejalaList.length} items`
      );

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

  async cleanupData(request, h) {
    try {
      console.log("=== CLEANUP DATA ===");

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

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const veryStaleProcessing = await prisma.diagnosis.deleteMany({
        where: {
          status: "processing",
          createdAt: {
            lt: sevenDaysAgo,
          },
        },
      });

      console.log("Cleanup completed - Users are preserved");

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
