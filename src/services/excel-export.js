const ExcelJS = require("exceljs")

class ExcelExportService {
  static async exportDiagnosisData(diagnoses) {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Data Diagnosis")

    // Add headers
    worksheet.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Nama", key: "nama", width: 20 },
      { header: "No WhatsApp", key: "noWhatsapp", width: 15 },
      { header: "Umur", key: "umur", width: 8 },
      { header: "Jenis Kelamin", key: "jenisKelamin", width: 12 },
      { header: "Diagnosis", key: "diagnosis", width: 30 },
      { header: "Persentase", key: "persentase", width: 12 },
      { header: "Tanggal", key: "tanggal", width: 15 },
    ]

    // Add data
    diagnoses.forEach((diagnosis, index) => {
      worksheet.addRow({
        no: index + 1,
        nama: diagnosis.user.nama,
        noWhatsapp: diagnosis.user.noWhatsapp,
        umur: diagnosis.user.umur || "-",
        jenisKelamin:
          diagnosis.user.jenisKelamin === "L" ? "Laki-laki" : diagnosis.user.jenisKelamin === "P" ? "Perempuan" : "-",
        diagnosis: diagnosis.penyakit?.nama || "-",
        persentase: diagnosis.persentase ? `${diagnosis.persentase}%` : "-",
        tanggal: new Date(diagnosis.createdAt).toLocaleDateString("id-ID"),
      })
    })

    // Style headers
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6F3FF" },
    }

    return workbook
  }

  static async exportGejalaData(gejalaList) {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Data Gejala")

    worksheet.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Kode", key: "kode", width: 8 },
      { header: "Nama Gejala", key: "nama", width: 50 },
      { header: "Deskripsi", key: "deskripsi", width: 30 },
    ]

    gejalaList.forEach((gejala, index) => {
      worksheet.addRow({
        no: index + 1,
        kode: gejala.kode,
        nama: gejala.nama,
        deskripsi: gejala.deskripsi || "-",
      })
    })

    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6F3FF" },
    }

    return workbook
  }

  static async exportRulesData(rules) {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Data Rules")

    worksheet.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Kode Penyakit", key: "kodePenyakit", width: 15 },
      { header: "Nama Penyakit", key: "namaPenyakit", width: 30 },
      { header: "Kode Gejala", key: "kodeGejala", width: 15 },
      { header: "Nama Gejala", key: "namaGejala", width: 40 },
      { header: "CF Value", key: "cfValue", width: 10 },
    ]

    rules.forEach((rule, index) => {
      worksheet.addRow({
        no: index + 1,
        kodePenyakit: rule.penyakit.kode,
        namaPenyakit: rule.penyakit.nama,
        kodeGejala: rule.gejala.kode,
        namaGejala: rule.gejala.nama,
        cfValue: rule.cfValue,
      })
    })

    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6F3FF" },
    }

    return workbook
  }
}

module.exports = ExcelExportService
