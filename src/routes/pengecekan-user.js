const Joi = require("joi")
const PengecekanUserController = require("../controllers/pengecekan-user")

const pengecekanUserRoutes = [
  {
    method: "GET",
    path: "/api/pengecekan-user",
    handler: PengecekanUserController.getAllDiagnoses,
    options: {
      validate: {
        query: Joi.object({
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(10),
          search: Joi.string().allow("").default(""),
          penyakitId: Joi.string().allow("").default(""),
        }),
      },
    },
  },
  {
    method: "GET",
    path: "/api/pengecekan-user/{id}",
    handler: PengecekanUserController.getDiagnosisDetail,
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
    path: "/api/pengecekan-user/export/excel",
    handler: PengecekanUserController.exportDiagnoses,
  },
  {
    method: "DELETE",
    path: "/api/pengecekan-user/{id}",
    handler: PengecekanUserController.deleteDiagnosis,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required(),
        }),
      },
    },
  },
]

module.exports = pengecekanUserRoutes
