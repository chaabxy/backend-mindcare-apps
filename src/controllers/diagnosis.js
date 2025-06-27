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
          maxWait: 2000, // Reduce to 2 seconds
          timeout: 4000, // Reduce to 4 seconds
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

      // ULTRA OPTIMIZED: Parallel data fetching with absolute minimal fields
      const dataFetchStartTime = Date.now();
      const uniqueGejalaIds = [
        ...new Set(gejalaInputs.map((input) => input.gejalaId)),
      ];

      console.log(
        `  🔍 Fetching data for ${uniqueGejalaIds.length} unique gejala...`
      );

      // EXTREME OPTIMIZATION: Use Promise.allSettled for better error handling
      const [diagnosisResult, gejalaResult, rulesResult] =
        await Promise.allSettled([
          // Get diagnosis with existing inputs - ABSOLUTE MINIMAL FIELDS
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
          // Get valid gejala IDs - ONLY IDs
          prisma.gejala.findMany({
            where: { id: { in: uniqueGejalaIds } },
            select: { id: true },
          }),
          // Get rules for calculation - CACHED APPROACH
          prisma.rule.findMany({
            select: {
              penyakitId: true,
              gejalaId: true,
              cfValue: true,
              penyakit: { select: { id: true, nama: true, kode: true } },
              gejala: { select: { id: true, nama: true, kode: true } },
            },
          }),
        ]);

      // Handle any failed promises
      if (diagnosisResult.status === "rejected") {
        throw new Error(
          "Failed to fetch diagnosis: " + diagnosisResult.reason.message
        );
      }
      if (gejalaResult.status === "rejected") {
        throw new Error(
          "Failed to fetch gejala: " + gejalaResult.reason.message
        );
      }
      if (rulesResult.status === "rejected") {
        throw new Error("Failed to fetch rules: " + rulesResult.reason.message);
      }

      const diagnosis = diagnosisResult.value;
      const existingGejala = gejalaResult.value;
      const rules = rulesResult.value;

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

      // ULTRA OPTIMIZED: Process inputs with Set operations
      const processStartTime = Date.now();
      const validGejalaIds = new Set(existingGejala.map((g) => g.id));
      const existingGejalaMap = new Map(
        diagnosis.userGejalaInputs.map((input) => [input.gejalaId, input])
      );

      const newInputsToAdd = [];
      const inputsToUpdate = [];
      const processedGejalaIds = new Set();

      // OPTIMIZED: Single loop with early validation
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

      // ULTRA OPTIMIZED: Database operations with reduced timeout
      const dbStartTime = Date.now();
      const updatedInputs = await prisma.$transaction(
        async (tx) => {
          console.log(
            `  🔄 DB Transaction started: ${Date.now() - dbStartTime}ms`
          );

          // OPTIMIZED: Batch operations
          const operations = [];

          if (newInputsToAdd.length > 0) {
            operations.push(
              tx.userGejalaInput.createMany({
                data: newInputsToAdd,
                skipDuplicates: true,
              })
            );
          }

          if (inputsToUpdate.length > 0) {
            operations.push(
              ...inputsToUpdate.map((input) =>
                tx.userGejalaInput.update({
                  where: { id: input.id },
                  data: { cfUser: input.cfUser },
                })
              )
            );
          }

          // Execute all operations in parallel
          if (operations.length > 0) {
            await Promise.all(operations);
          }

          // Get all current inputs for calculation - MINIMAL FIELDS
          return await tx.userGejalaInput.findMany({
            where: { diagnosisId },
            select: {
              gejalaId: true,
              cfUser: true,
              gejala: { select: { kode: true, nama: true } },
            },
          });
        },
        {
          maxWait: 1500, // Reduce to 1.5 seconds
          timeout: 4000, // Reduce to 4 seconds
        }
      );
      console.log(
        `⏱️ Step 4 - Database operations: ${Date.now() - dbStartTime}ms`
      );

      // OPTIMIZED: CF calculation with pre-processed data
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

      // OPTIMIZED: Final update with minimal data
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
          select: {
            id: true,
            penyakitId: true,
            cfResult: true,
            persentase: true,
            status: true,
            penyakit: { select: { id: true, nama: true, kode: true } },
            user: { select: { id: true, nama: true, noWhatsapp: true } },
            userGejalaInputs: {
              select: {
                gejalaId: true,
                cfUser: true,
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
          select: {
            id: true,
            status: true,
            user: { select: { id: true, nama: true, noWhatsapp: true } },
            userGejalaInputs: {
              select: {
                gejalaId: true,
                cfUser: true,
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

      // ULTRA OPTIMIZED: Cache-friendly query with minimal fields
      const gejalaList = await prisma.gejala.findMany({
        select: {
          id: true,
          kode: true,
          nama: true,
          deskripsi: true,
        },
        orderBy: { kode: "asc" },
        // Add caching hint
        // cacheStrategy: { ttl: 300 }, // 5 minutes cache if supported
      });

      const duration = Date.now() - startTime;
      console.log(
        `⏱️ Gejala list fetched in ${duration}ms - Found ${gejalaList.length} items`
      );

      // Add cache headers for client-side caching
      return h
        .response({
          success: true,
          data: gejalaList,
        })
        .header("Cache-Control", "public, max-age=300") // 5 minutes cache
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
