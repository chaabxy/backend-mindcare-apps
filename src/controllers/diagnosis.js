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
    try {
      const { diagnosisId, gejalaInputs } = request.payload;

      console.log("=== SUBMIT SYMPTOMS REQUEST ===");
      console.log("Diagnosis ID:", diagnosisId);
      console.log("Gejala Inputs Count:", gejalaInputs.length);
      console.log("Gejala Inputs:", JSON.stringify(gejalaInputs, null, 2));

      // Validate inputs
      if (!diagnosisId || !gejalaInputs || gejalaInputs.length === 0) {
        return h
          .response({
            success: false,
            message: "Data diagnosis dan gejala wajib diisi",
          })
          .code(400);
      }

      // Validate diagnosis exists and get user info
      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id: diagnosisId },
        include: {
          user: true,
          userGejalaInputs: {
            include: {
              gejala: true,
            },
          },
        },
      });

      if (!diagnosis) {
        console.log("Diagnosis not found:", diagnosisId);
        return h
          .response({
            success: false,
            message: "Diagnosis tidak ditemukan",
          })
          .code(404);
      }

      console.log("Found diagnosis for user:", diagnosis.user.nama);
      console.log("Existing gejala inputs:", diagnosis.userGejalaInputs.length);

      // Check if diagnosis is already completed
      if (diagnosis.status === "completed") {
        console.log("Diagnosis already completed");
        return h
          .response({
            success: false,
            message: "Diagnosis sudah selesai",
          })
          .code(400);
      }

      // Get existing gejala inputs for this diagnosis
      const existingGejalaIds = new Set(
        diagnosis.userGejalaInputs.map((input) => input.gejalaId)
      );
      console.log("Existing gejala IDs:", Array.from(existingGejalaIds));

      // Validate all new gejala exist
      console.log("Validating new gejala...");
      const newGejalaIds = [
        ...new Set(gejalaInputs.map((input) => input.gejalaId)),
      ]; // Remove duplicates
      const existingGejala = await prisma.gejala.findMany({
        where: {
          id: {
            in: newGejalaIds,
          },
        },
        select: {
          id: true,
        },
      });

      console.log(
        "Found existing gejala:",
        existingGejala.length,
        "out of",
        newGejalaIds.length
      );

      if (existingGejala.length === 0) {
        return h
          .response({
            success: false,
            message: "Tidak ada gejala yang valid ditemukan",
          })
          .code(400);
      }

      const validGejalaIds = new Set(existingGejala.map((g) => g.id));

      // Prepare new inputs (only add new ones, don't duplicate existing)
      const newInputsToAdd = [];
      const updatedInputs = [];
      const processedGejalaIds = new Set();

      for (const input of gejalaInputs) {
        // Skip if gejala doesn't exist
        if (!validGejalaIds.has(input.gejalaId)) {
          console.log("Skipping invalid gejala:", input.gejalaId);
          continue;
        }

        // Skip if already processed in this request (remove duplicates in request)
        if (processedGejalaIds.has(input.gejalaId)) {
          console.log("Skipping duplicate gejala in request:", input.gejalaId);
          continue;
        }

        processedGejalaIds.add(input.gejalaId);

        // Check if this gejala already exists for this diagnosis
        if (existingGejalaIds.has(input.gejalaId)) {
          // Update existing input
          console.log("Updating existing gejala input:", input.gejalaId);
          updatedInputs.push({
            gejalaId: input.gejalaId,
            cfUser: Number.parseFloat(input.cfUser),
          });
        } else {
          // Add new input
          console.log("Adding new gejala input:", input.gejalaId);
          newInputsToAdd.push({
            diagnosisId,
            gejalaId: input.gejalaId,
            cfUser: Number.parseFloat(input.cfUser),
          });
        }
      }

      console.log("New inputs to add:", newInputsToAdd.length);
      console.log("Existing inputs to update:", updatedInputs.length);

      // Add new inputs if any
      if (newInputsToAdd.length > 0) {
        console.log("Adding new gejala inputs...");
        const createResult = await prisma.userGejalaInput.createMany({
          data: newInputsToAdd,
          skipDuplicates: true,
        });
        console.log("Created new gejala inputs:", createResult.count);
      }

      // Update existing inputs if any
      for (const updateInput of updatedInputs) {
        console.log("Updating gejala input:", updateInput.gejalaId);
        await prisma.userGejalaInput.updateMany({
          where: {
            diagnosisId: diagnosisId,
            gejalaId: updateInput.gejalaId,
          },
          data: {
            cfUser: updateInput.cfUser,
          },
        });
      }

      // Get all current inputs for this diagnosis (existing + new)
      const allCurrentInputs = await prisma.userGejalaInput.findMany({
        where: { diagnosisId },
        include: {
          gejala: true,
        },
      });

      console.log(
        "Total current inputs for diagnosis:",
        allCurrentInputs.length
      );

      // Get all rules for calculation
      const rules = await prisma.rule.findMany({
        include: {
          penyakit: true,
          gejala: true,
        },
      });

      console.log("Found", rules.length, "rules for calculation");

      // Prepare data for CF calculation
      const inputsForCalculation = allCurrentInputs.map((input) => ({
        gejalaId: input.gejalaId,
        cfUser: input.cfUser,
      }));

      console.log(
        "Inputs for calculation:",
        JSON.stringify(inputsForCalculation, null, 2)
      );

      // Calculate diagnosis using Certainty Factor
      const calculationResult = await CertaintyFactorService.calculateDiagnosis(
        inputsForCalculation,
        rules
      );

      console.log("=== CALCULATION RESULT ===");
      console.log(
        "All results:",
        JSON.stringify(calculationResult.allResults, null, 2)
      );
      console.log(
        "Best diagnosis:",
        JSON.stringify(calculationResult.bestDiagnosis, null, 2)
      );

      // Update diagnosis with result
      let finalDiagnosis = null;
      if (
        calculationResult.bestDiagnosis &&
        calculationResult.bestDiagnosis.cfValue > 0
      ) {
        console.log("Updating diagnosis with result...");

        // Get penyakit info
        const penyakit = await prisma.penyakit.findUnique({
          where: { id: calculationResult.bestDiagnosis.penyakitId },
        });

        console.log("Found penyakit:", penyakit?.nama);

        // Update diagnosis with result
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
              include: {
                gejala: true,
              },
            },
          },
        });

        // COMMENT OUT atau HAPUS bagian ini:
        /*
        // Send WhatsApp notification to user
        try {
          console.log("Sending WhatsApp notification to user...");
          const whatsappResult = await WhatsAppService.sendDiagnosisResult(
            finalDiagnosis.user.noWhatsapp,
            finalDiagnosis.user.nama,
            calculationResult.bestDiagnosis,
            penyakit.nama
          );
          console.log("WhatsApp notification result:", whatsappResult);
        } catch (whatsappError) {
          console.error("WhatsApp notification failed:", whatsappError);
          // Don't fail the diagnosis if WhatsApp fails
        }
        */
      } else {
        console.log("No significant diagnosis found, marking as completed");

        // No diagnosis found, still mark as completed
        finalDiagnosis = await prisma.diagnosis.update({
          where: { id: diagnosisId },
          data: {
            status: "completed",
          },
          include: {
            user: true,
            userGejalaInputs: {
              include: {
                gejala: true,
              },
            },
          },
        });

        // COMMENT OUT atau HAPUS bagian ini:
        /*
        // Send WhatsApp notification for no diagnosis
        try {
          console.log("Sending WhatsApp notification for no diagnosis...");
          const whatsappResult = await WhatsAppService.sendNoDiagnosisResult(
            finalDiagnosis.user.noWhatsapp,
            finalDiagnosis.user.nama
          );
          console.log("WhatsApp notification result:", whatsappResult);
        } catch (whatsappError) {
          console.error("WhatsApp notification failed:", whatsappError);
        }
        */
      }

      console.log("=== FINAL DIAGNOSIS ===");
      console.log("Final diagnosis ID:", finalDiagnosis.id);
      console.log("Penyakit:", finalDiagnosis.penyakit?.nama || "None");
      console.log("Persentase:", finalDiagnosis.persentase || 0);
      console.log(
        "Total gejala inputs:",
        finalDiagnosis.userGejalaInputs.length
      );

      const responseData = {
        diagnosis: finalDiagnosis,
        calculationDetails: calculationResult,
      };

      console.log("=== SENDING RESPONSE ===");
      console.log("Response success: true");

      return h
        .response({
          success: true,
          data: responseData,
        })
        .code(200);
    } catch (error) {
      console.error("=== SUBMIT SYMPTOMS ERROR ===");
      console.error("Error:", error);
      console.error("Stack trace:", error.stack);

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
            message: "Transaksi database timeout. Silakan coba lagi.",
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
