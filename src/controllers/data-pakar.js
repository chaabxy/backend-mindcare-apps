const prisma = require("../config/database")
const ExcelExportService = require("../services/excel-export")

const DataPakarController = {
  // Gejala CRUD
  async getGejala(request, h) {
    try {
      const gejala = await prisma.gejala.findMany({
        orderBy: { kode: "asc" },
      })
      return h.response({ success: true, data: gejala }).code(200)
    } catch (error) {
      return h.response({ success: false, message: "Gagal mengambil data gejala" }).code(500)
    }
  },

  async createGejala(request, h) {
    try {
      const { kode, nama, deskripsi } = request.payload
      const gejala = await prisma.gejala.create({
        data: { kode, nama, deskripsi },
      })
      return h.response({ success: true, data: gejala }).code(201)
    } catch (error) {
      return h.response({ success: false, message: "Gagal membuat gejala" }).code(500)
    }
  },

  async updateGejala(request, h) {
    try {
      const { id } = request.params
      const { kode, nama, deskripsi } = request.payload
      const gejala = await prisma.gejala.update({
        where: { id },
        data: { kode, nama, deskripsi },
      })
      return h.response({ success: true, data: gejala }).code(200)
    } catch (error) {
      return h.response({ success: false, message: "Gagal mengupdate gejala" }).code(500)
    }
  },

  async deleteGejala(request, h) {
    try {
      const { id } = request.params
      await prisma.gejala.delete({ where: { id } })
      return h.response({ success: true, message: "Gejala berhasil dihapus" }).code(200)
    } catch (error) {
      return h.response({ success: false, message: "Gagal menghapus gejala" }).code(500)
    }
  },

  // Penyakit CRUD
  async getPenyakit(request, h) {
    try {
      const penyakit = await prisma.penyakit.findMany({
        orderBy: { kode: "asc" },
      })
      return h.response({ success: true, data: penyakit }).code(200)
    } catch (error) {
      return h.response({ success: false, message: "Gagal mengambil data penyakit" }).code(500)
    }
  },

  async createPenyakit(request, h) {
    try {
      const { kode, nama, deskripsi } = request.payload
      const penyakit = await prisma.penyakit.create({
        data: { kode, nama, deskripsi },
      })
      return h.response({ success: true, data: penyakit }).code(201)
    } catch (error) {
      return h.response({ success: false, message: "Gagal membuat penyakit" }).code(500)
    }
  },

  async updatePenyakit(request, h) {
    try {
      const { id } = request.params
      const { kode, nama, deskripsi } = request.payload
      const penyakit = await prisma.penyakit.update({
        where: { id },
        data: { kode, nama, deskripsi },
      })
      return h.response({ success: true, data: penyakit }).code(200)
    } catch (error) {
      return h.response({ success: false, message: "Gagal mengupdate penyakit" }).code(500)
    }
  },

  async deletePenyakit(request, h) {
    try {
      const { id } = request.params
      await prisma.penyakit.delete({ where: { id } })
      return h.response({ success: true, message: "Penyakit berhasil dihapus" }).code(200)
    } catch (error) {
      return h.response({ success: false, message: "Gagal menghapus penyakit" }).code(500)
    }
  },

  // Rules CRUD
  async getRules(request, h) {
    try {
      const rules = await prisma.rule.findMany({
        include: {
          penyakit: true,
          gejala: true,
        },
        orderBy: [{ penyakit: { kode: "asc" } }, { gejala: { kode: "asc" } }],
      })
      return h.response({ success: true, data: rules }).code(200)
    } catch (error) {
      return h.response({ success: false, message: "Gagal mengambil data rules" }).code(500)
    }
  },

  async createRule(request, h) {
    try {
      const { penyakitId, gejalaId, cfValue } = request.payload
      const rule = await prisma.rule.create({
        data: { penyakitId, gejalaId, cfValue },
        include: {
          penyakit: true,
          gejala: true,
        },
      })
      return h.response({ success: true, data: rule }).code(201)
    } catch (error) {
      return h.response({ success: false, message: "Gagal membuat rule" }).code(500)
    }
  },

  async updateRule(request, h) {
    try {
      const { id } = request.params
      const { penyakitId, gejalaId, cfValue } = request.payload
      const rule = await prisma.rule.update({
        where: { id },
        data: { penyakitId, gejalaId, cfValue },
        include: {
          penyakit: true,
          gejala: true,
        },
      })
      return h.response({ success: true, data: rule }).code(200)
    } catch (error) {
      return h.response({ success: false, message: "Gagal mengupdate rule" }).code(500)
    }
  },

  async deleteRule(request, h) {
    try {
      const { id } = request.params
      await prisma.rule.delete({ where: { id } })
      return h.response({ success: true, message: "Rule berhasil dihapus" }).code(200)
    } catch (error) {
      return h.response({ success: false, message: "Gagal menghapus rule" }).code(500)
    }
  },

  // Export functions
  async exportGejala(request, h) {
    try {
      const gejalaList = await prisma.gejala.findMany({
        orderBy: { kode: "asc" },
      })

      const workbook = await ExcelExportService.exportGejalaData(gejalaList)
      const buffer = await workbook.xlsx.writeBuffer()

      return h
        .response(buffer)
        .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .header(
          "Content-Disposition",
          `attachment; filename="data-gejala-${new Date().toISOString().split("T")[0]}.xlsx"`,
        )
        .code(200)
    } catch (error) {
      return h.response({ success: false, message: "Gagal export data gejala" }).code(500)
    }
  },

  async exportRules(request, h) {
    try {
      const rules = await prisma.rule.findMany({
        include: {
          penyakit: true,
          gejala: true,
        },
        orderBy: [{ penyakit: { kode: "asc" } }, { gejala: { kode: "asc" } }],
      })

      const workbook = await ExcelExportService.exportRulesData(rules)
      const buffer = await workbook.xlsx.writeBuffer()

      return h
        .response(buffer)
        .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .header(
          "Content-Disposition",
          `attachment; filename="data-rules-${new Date().toISOString().split("T")[0]}.xlsx"`,
        )
        .code(200)
    } catch (error) {
      return h.response({ success: false, message: "Gagal export data rules" }).code(500)
    }
  },
}

module.exports = DataPakarController
