class CertaintyFactorService {
  // Calculate CF for single premise rule: CF(H,E) = CF(E) * CF(H|E)
  static calculateSinglePremise(cfUser, cfExpert) {
    return cfUser * cfExpert;
  }

  // Calculate CF combine for multiple rules with same conclusion
  // CF(H, E1 ∧ E2) = CF(H, E1) + CF(H, E2) * [1 - CF(H, E1)]
  static calculateCombine(cf1, cf2) {
    return cf1 + cf2 * (1 - cf1);
  }

  // OPTIMIZED Calculate final diagnosis based on user inputs and rules
  static async calculateDiagnosis(userInputs, rules) {
    const startTime = Date.now();
    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
      console.log("=== CERTAINTY FACTOR CALCULATION ===");
      console.log("User inputs:", userInputs.length);
      console.log("Total rules:", rules.length);
    }

    // Create lookup maps for faster access
    const userInputMap = new Map(
      userInputs.map((input) => [input.gejalaId, input.cfUser])
    );

    // Group rules by penyakit for efficient processing
    const rulesByPenyakit = new Map();
    for (const rule of rules) {
      if (!rulesByPenyakit.has(rule.penyakitId)) {
        rulesByPenyakit.set(rule.penyakitId, {
          penyakit: rule.penyakit,
          rules: [],
        });
      }
      rulesByPenyakit.get(rule.penyakitId).rules.push(rule);
    }

    if (isDev)
      console.log(
        "Rules grouped by penyakit:",
        rulesByPenyakit.size,
        "diseases"
      );

    const diagnosisResults = {};

    // Calculate CF for each penyakit
    for (const [penyakitId, penyakitData] of rulesByPenyakit) {
      const penyakitRules = penyakitData.rules;

      if (isDev) {
        console.log(
          `\n--- Calculating for ${penyakitData.penyakit.nama} (${penyakitData.penyakit.kode}) ---`
        );
        console.log(`Rules count: ${penyakitRules.length}`);
      }

      let combinedCF = 0;
      let appliedRules = 0;

      for (const rule of penyakitRules) {
        const userCF = userInputMap.get(rule.gejalaId);

        if (userCF !== undefined) {
          if (isDev) {
            console.log(
              `Rule: ${rule.gejala.kode} - CF Expert: ${rule.cfValue}, CF User: ${userCF}`
            );
          }

          // Calculate CF for this rule
          const cfResult = this.calculateSinglePremise(userCF, rule.cfValue);

          // Combine with previous CF
          if (combinedCF === 0) {
            combinedCF = cfResult;
          } else {
            combinedCF = this.calculateCombine(combinedCF, cfResult);
          }

          appliedRules++;

          if (isDev) console.log(`  Combined CF: ${combinedCF}`);
        }
      }

      if (isDev) {
        console.log(
          `Final CF for ${penyakitData.penyakit.nama}: ${combinedCF}`
        );
        console.log(`Applied rules: ${appliedRules}/${penyakitRules.length}`);
      }

      if (combinedCF > 0) {
        const percentage = Math.round(combinedCF * 100 * 100) / 100; // Round to 2 decimal places
        diagnosisResults[penyakitId] = {
          penyakitId: penyakitId,
          penyakitNama: penyakitData.penyakit.nama,
          penyakitKode: penyakitData.penyakit.kode,
          cfValue: combinedCF,
          percentage: percentage,
          appliedRules: appliedRules,
          totalRules: penyakitRules.length,
        };
      }
    }

    // Find the highest CF result
    let bestDiagnosis = null;
    let highestCF = 0;

    for (const result of Object.values(diagnosisResults)) {
      if (result.cfValue > highestCF) {
        highestCF = result.cfValue;
        bestDiagnosis = {
          penyakitId: result.penyakitId,
          cfValue: result.cfValue,
          percentage: result.percentage,
        };
      }
    }

    const duration = Date.now() - startTime;
    if (isDev) {
      console.log(`\n=== CF CALCULATION COMPLETED in ${duration}ms ===`);
      if (bestDiagnosis) {
        const bestResult = diagnosisResults[bestDiagnosis.penyakitId];
        console.log(
          `Best: ${bestResult.penyakitNama} - ${bestDiagnosis.percentage}%`
        );
      } else {
        console.log("No diagnosis found");
      }
    }

    return {
      allResults: diagnosisResults,
      bestDiagnosis,
    };
  }
}

module.exports = CertaintyFactorService;
