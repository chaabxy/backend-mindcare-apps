const Joi = require("joi");
const DiagnosisController = require("../controllers/diagnosis");

const diagnosisRoutes = [
  {
    method: "POST",
    path: "/api/diagnosis/start",
    handler: DiagnosisController.startDiagnosis,
    options: {
      validate: {
        payload: Joi.object({
          nama: Joi.string().min(2).max(100).required(),
          noWhatsapp: Joi.string().min(10).max(20).required(),
          umur: Joi.number().integer().min(1).max(120).optional().allow(null),
          jenisKelamin: Joi.string().valid("L", "P").optional().allow(null, ""),
        }),
      },
    },
  },
  {
    method: "POST",
    path: "/api/diagnosis/submit",
    handler: DiagnosisController.submitSymptoms,
    options: {
      validate: {
        payload: Joi.object({
          diagnosisId: Joi.string().required(),
          gejalaInputs: Joi.array()
            .items(
              Joi.object({
                gejalaId: Joi.string().required(),
                cfUser: Joi.number().valid(0.2, 0.4, 0.6, 0.8, 1.0).required(),
              })
            )
            .min(1)
            .required(),
        }),
      },
    },
  },
  {
    method: "GET",
    path: "/api/diagnosis/gejala",
    handler: DiagnosisController.getGejalaList,
  },
  {
    method: "GET",
    path: "/api/diagnosis/users",
    handler: DiagnosisController.getAllUsers,
  },
  {
    method: "POST",
    path: "/api/diagnosis/cleanup",
    handler: DiagnosisController.cleanupData,
  },
  {
    method: "GET",
    path: "/api/diagnosis/{id}",
    handler: DiagnosisController.getDiagnosisById,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required(),
        }),
      },
    },
  },
  {
    method: "GET",
    path: "/api/diagnosis/user/{userId}",
    handler: DiagnosisController.getUserDiagnoses,
    options: {
      validate: {
        params: Joi.object({
          userId: Joi.string().required(),
        }),
      },
    },
  },
];

module.exports = diagnosisRoutes;
