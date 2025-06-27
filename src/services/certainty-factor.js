class CertaintyFactorService {
  // Calculate CF for single premise rule: CF(H,E) = CF(E) * CF(H|E)
  static calculateSinglePremise(cfUser, cfExpert) {
    const isDev = process.env.NODE_ENV !== "production";
    const result = cfUser * cfExpert;
    if (isDev)
      console.log(
        `CF Single Premise: CF(User)=${cfUser} * CF(Expert)=${cfExpert} = ${result}`
      );
    return result;
  }

  // Calculate CF combine for multiple rules with same conclusion
  // CF(H, E1 ∧ E2) = CF(H, E1) + CF(H, E2) * [1 - CF(H, E1)]
  static calculateCombine(cf1, cf2) {
    const isDev = process.env.NODE_ENV !== "production";
    const result = cf1 + cf2 * (1 - cf1);
    if (isDev)
      console.log(`CF Combine: ${cf1} + ${cf2} * (1 - ${cf1}) = ${result}`);
    return result;
  }

  // Calculate final diagnosis based on user inputs and rules
  static async calculateDiagnosis(userInputs, rules) {
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) console.log("=== CERTAINTY FACTOR CALCULATION ===");
    if (isDev) console.log("User inputs:", JSON.stringify(userInputs, null, 2));
    if (isDev) console.log("Total rules:", rules.length);

    const diagnosisResults = {};

    // Group rules by penyakit
    const rulesByPenyakit = {};
    rules.forEach((rule) => {
      if (!rulesByPenyakit[rule.penyakitId]) {
        rulesByPenyakit[rule.penyakitId] = {
          penyakit: rule.penyakit,
          rules: [],
        };
      }
      rulesByPenyakit[rule.penyakitId].rules.push(rule);
    });

    if (isDev)
      console.log(
        "Rules grouped by penyakit:",
        Object.keys(rulesByPenyakit).length,
        "diseases"
      );

    // Calculate CF for each penyakit
    Object.keys(rulesByPenyakit).forEach((penyakitId) => {
      const penyakitData = rulesByPenyakit[penyakitId];
      const penyakitRules = penyakitData.rules;

      if (isDev)
        console.log(
          `\n--- Calculating for ${penyakitData.penyakit.nama} (${penyakitData.penyakit.kode}) ---`
        );
      if (isDev) console.log(`Rules count: ${penyakitRules.length}`);

      let combinedCF = 0;
      let appliedRules = 0;

      penyakitRules.forEach((rule, index) => {
        const userInput = userInputs.find(
          (input) => input.gejalaId === rule.gejalaId
        );

        if (userInput) {
          if (isDev)
            console.log(
              `Rule ${index + 1}: ${rule.gejala.kode} - ${rule.gejala.nama}`
            );
          if (isDev) console.log(`  CF Expert: ${rule.cfValue}`);
          if (isDev) console.log(`  CF User: ${userInput.cfUser}`);

          // Calculate CF for this rule
          const cfResult = this.calculateSinglePremise(
            userInput.cfUser,
            rule.cfValue
          );
          if (isDev) console.log(`  CF Result: ${cfResult}`);

          // Combine with previous CF
          if (combinedCF === 0) {
            combinedCF = cfResult;
            if (isDev) console.log(`  Initial CF: ${combinedCF}`);
          } else {
            const oldCF = combinedCF;
            combinedCF = this.calculateCombine(combinedCF, cfResult);
            if (isDev)
              console.log(
                `  Combined CF: ${oldCF} + ${cfResult} = ${combinedCF}`
              );
          }

          appliedRules++;
        } else {
          if (isDev)
            console.log(
              `Rule ${index + 1}: ${rule.gejala.kode} - No user input (skipped)`
            );
        }
      });

      if (isDev)
        console.log(
          `Final CF for ${penyakitData.penyakit.nama}: ${combinedCF}`
        );
      if (isDev)
        console.log(`Applied rules: ${appliedRules}/${penyakitRules.length}`);

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
        if (isDev) console.log(`Added to results: ${percentage}%`);
      }
    });

    if (isDev) console.log("\n=== DIAGNOSIS RESULTS ===");
    if (isDev)
      console.log("All results:", JSON.stringify(diagnosisResults, null, 2));

    // Find the highest CF result
    let bestDiagnosis = null;
    let highestCF = 0;

    Object.keys(diagnosisResults).forEach((penyakitId) => {
      const result = diagnosisResults[penyakitId];
      if (isDev)
        console.log(
          `${result.penyakitNama}: ${result.percentage}% (CF: ${result.cfValue})`
        );

      if (result.cfValue > highestCF) {
        highestCF = result.cfValue;
        bestDiagnosis = {
          penyakitId,
          cfValue: result.cfValue,
          percentage: result.percentage,
        };
      }
    });

    if (isDev) console.log("\n=== BEST DIAGNOSIS ===");
    if (bestDiagnosis) {
      const bestResult = diagnosisResults[bestDiagnosis.penyakitId];
      if (isDev)
        console.log(
          `Best: ${bestResult.penyakitNama} - ${bestDiagnosis.percentage}%`
        );
    } else {
      if (isDev) console.log("No diagnosis found");
    }

    return {
      allResults: diagnosisResults,
      bestDiagnosis,
    };
  }
}

module.exports = CertaintyFactorService;
