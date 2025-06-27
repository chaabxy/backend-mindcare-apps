const Joi = require("joi")
const DataPakarController = require("../controllers/data-pakar")

const dataPakarRoutes = [
  // Gejala routes
  {
    method: "GET",
    path: "/api/data-pakar/gejala",
    handler: DataPakarController.getGejala,
  },
  {
    method: "POST",
    path: "/api/data-pakar/gejala",
    handler: DataPakarController.createGejala,
    options: {
      validate: {
        payload: Joi.object({
          kode: Joi.string().required(),
          nama: Joi.string().required(),
          deskripsi: Joi.string().allow("").optional(),
        }),
      },
    },
  },
  {
    method: "PUT",
    path: "/api/data-pakar/gejala/{id}",
    handler: DataPakarController.updateGejala,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required(),
        }),
        payload: Joi.object({
          kode: Joi.string().required(),
          nama: Joi.string().required(),
          deskripsi: Joi.string().allow("").optional(),
        }),
      },
    },
  },
  {
    method: "DELETE",
    path: "/api/data-pakar/gejala/{id}",
    handler: DataPakarController.deleteGejala,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required(),
        }),
      },
    },
  },

  // Penyakit routes
  {
    method: "GET",
    path: "/api/data-pakar/penyakit",
    handler: DataPakarController.getPenyakit,
  },
  {
    method: "POST",
    path: "/api/data-pakar/penyakit",
    handler: DataPakarController.createPenyakit,
    options: {
      validate: {
        payload: Joi.object({
          kode: Joi.string().required(),
          nama: Joi.string().required(),
          deskripsi: Joi.string().allow("").optional(),
        }),
      },
    },
  },
  {
    method: "PUT",
    path: "/api/data-pakar/penyakit/{id}",
    handler: DataPakarController.updatePenyakit,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required(),
        }),
        payload: Joi.object({
          kode: Joi.string().required(),
          nama: Joi.string().required(),
          deskripsi: Joi.string().allow("").optional(),
        }),
      },
    },
  },
  {
    method: "DELETE",
    path: "/api/data-pakar/penyakit/{id}",
    handler: DataPakarController.deletePenyakit,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required(),
        }),
      },
    },
  },

  // Rules routes
  {
    method: "GET",
    path: "/api/data-pakar/rules",
    handler: DataPakarController.getRules,
  },
  {
    method: "POST",
    path: "/api/data-pakar/rules",
    handler: DataPakarController.createRule,
    options: {
      validate: {
        payload: Joi.object({
          penyakitId: Joi.string().required(),
          gejalaId: Joi.string().required(),
          cfValue: Joi.number().min(0).max(1).required(),
        }),
      },
    },
  },
  {
    method: "PUT",
    path: "/api/data-pakar/rules/{id}",
    handler: DataPakarController.updateRule,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required(),
        }),
        payload: Joi.object({
          penyakitId: Joi.string().required(),
          gejalaId: Joi.string().required(),
          cfValue: Joi.number().min(0).max(1).required(),
        }),
      },
    },
  },
  {
    method: "DELETE",
    path: "/api/data-pakar/rules/{id}",
    handler: DataPakarController.deleteRule,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required(),
        }),
      },
    },
  },

  // Export routes
  {
    method: "GET",
    path: "/api/data-pakar/gejala/export",
    handler: DataPakarController.exportGejala,
  },
  {
    method: "GET",
    path: "/api/data-pakar/rules/export",
    handler: DataPakarController.exportRules,
  },
]

module.exports = dataPakarRoutes
