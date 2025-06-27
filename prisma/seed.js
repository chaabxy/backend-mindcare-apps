const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcrypt")

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10)
  await prisma.admin.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashedPassword,
      name: "Administrator",
    },
  })

  // Create penyakit data
  const penyakitData = [
    { kode: "P01", nama: "Gangguan Panik", deskripsi: "Panic Disorder" },
    { kode: "P02", nama: "Gangguan Kecemasan Umum", deskripsi: "Generalized Anxiety Disorder" },
    { kode: "P03", nama: "Gangguan Stres Pascatrauma", deskripsi: "Post-Traumatic Stress Disorder" },
  ]

  for (const penyakit of penyakitData) {
    await prisma.penyakit.upsert({
      where: { kode: penyakit.kode },
      update: {},
      create: penyakit,
    })
  }

  // Create gejala data (28 symptoms from document)
  const gejalaData = [
    { kode: "G01", nama: "Merasa Cemas/Khawatir dimana sebenarnya secara objektif tidak ada bahaya" },
    { kode: "G02", nama: "Khawatir akan nasib buruk merasa seperti diujung tanduk" },
    { kode: "G03", nama: "Rasa tercekik, sesak nafas atau sulit bernafas" },
    { kode: "G04", nama: "Kesulitan dalam konsentrasi/berpikir/susah fokus dalam menjalani aktivitas sehari-hari" },
    { kode: "G05", nama: "Selalu merasa resah/gelisah dan berpikiran tidak realistis (negatif)" },
    { kode: "G06", nama: "Keluhan lambung" },
    { kode: "G07", nama: "Kepala terasa ringan atau mau pingsan" },
    { kode: "G08", nama: "Nyeri otot Sering mengalami tegang/kaku/pegal pada otot" },
    { kode: "G09", nama: "Sensasi mati rasa atau Kesemutan" },
    { kode: "G10", nama: "Sakit kepala, rasa mual, Pusing, Vertigo, atau perasaan melayang" },
    { kode: "G11", nama: "Sering kencing atau diare" },
    { kode: "G12", nama: "Denyut nadi dan nafas yang cepat pada waktu istirahat" },
    { kode: "G13", nama: "Jantung berdebar-debar" },
    { kode: "G14", nama: "Mengamati lingkungan secara berlebihan sehingga mengakibatkan perhatian mudah teralih" },
    { kode: "G15", nama: "Perubahan pola makan (kurang nafsu makan atau sebaliknya)" },
    { kode: "G16", nama: "Perasaan seakan-akan diri atau lingkungan tidak realistik" },
    { kode: "G17", nama: "Rasa aliran panas dingin" },
    { kode: "G18", nama: "Mulut terasa kering" },
    { kode: "G19", nama: "Berkeringat berlebihan saat merasa cemas" },
    { kode: "G20", nama: "Bagian tubuh menjadi gemetaran dan tegang saat merasa cemas" },
    { kode: "G21", nama: "Sering mengalami ketakutan yang tidak realistis dan tidak bisa mengendalikan" },
    { kode: "G22", nama: "Merasa takut akan kematian" },
    { kode: "G23", nama: "Gejala yang dialami telah berlangsung dalam masa kira-kira satu bulan" },
    { kode: "G24", nama: "Merasa cemas dan khawatir berlebih mengenai satu atau beberapa kejadian" },
    { kode: "G25", nama: "Sulit mengendalikan kecemasan dan kekhawatiran" },
    { kode: "G26", nama: "Sering mengalami perubahan emosi mendalam (marah, frustrasi, atau depresi)" },
    { kode: "G27", nama: "Mudah lelah" },
    { kode: "G28", nama: "Adanya trauma dalam ingatan akan suatu kejadian" },
  ]

  for (const gejala of gejalaData) {
    await prisma.gejala.upsert({
      where: { kode: gejala.kode },
      update: {},
      create: gejala,
    })
  }

  // Create rules based on document
  const rulesData = [
    // Gangguan Panik (P01)
    { penyakitKode: "P01", gejalaKode: "G03", cfValue: 1.0 },
    { penyakitKode: "P01", gejalaKode: "G07", cfValue: 0.8 },
    { penyakitKode: "P01", gejalaKode: "G09", cfValue: 0.6 },
    { penyakitKode: "P01", gejalaKode: "G10", cfValue: 0.6 },
    { penyakitKode: "P01", gejalaKode: "G12", cfValue: 1.0 },
    { penyakitKode: "P01", gejalaKode: "G13", cfValue: 1.0 },
    { penyakitKode: "P01", gejalaKode: "G17", cfValue: 0.6 },
    { penyakitKode: "P01", gejalaKode: "G18", cfValue: 0.6 },
    { penyakitKode: "P01", gejalaKode: "G19", cfValue: 0.8 },
    { penyakitKode: "P01", gejalaKode: "G20", cfValue: 0.8 },
    { penyakitKode: "P01", gejalaKode: "G21", cfValue: 0.8 },
    { penyakitKode: "P01", gejalaKode: "G22", cfValue: 0.8 },
    { penyakitKode: "P01", gejalaKode: "G23", cfValue: 0.8 },

    // Gangguan Kecemasan Umum (P02)
    { penyakitKode: "P02", gejalaKode: "G01", cfValue: 1.0 },
    { penyakitKode: "P02", gejalaKode: "G02", cfValue: 1.0 },
    { penyakitKode: "P02", gejalaKode: "G04", cfValue: 0.8 },
    { penyakitKode: "P02", gejalaKode: "G05", cfValue: 1.0 },
    { penyakitKode: "P02", gejalaKode: "G06", cfValue: 0.6 },
    { penyakitKode: "P02", gejalaKode: "G08", cfValue: 0.6 },
    { penyakitKode: "P02", gejalaKode: "G11", cfValue: 0.6 },
    { penyakitKode: "P02", gejalaKode: "G14", cfValue: 0.8 },
    { penyakitKode: "P02", gejalaKode: "G15", cfValue: 0.6 },
    { penyakitKode: "P02", gejalaKode: "G24", cfValue: 1.0 },
    { penyakitKode: "P02", gejalaKode: "G25", cfValue: 1.0 },
    { penyakitKode: "P02", gejalaKode: "G26", cfValue: 1.0 },
    { penyakitKode: "P02", gejalaKode: "G27", cfValue: 0.8 },

    // Gangguan Stres Pascatrauma (P03)
    { penyakitKode: "P03", gejalaKode: "G14", cfValue: 0.8 },
    { penyakitKode: "P03", gejalaKode: "G16", cfValue: 0.8 },
    { penyakitKode: "P03", gejalaKode: "G22", cfValue: 1.0 },
    { penyakitKode: "P03", gejalaKode: "G26", cfValue: 0.8 },
    { penyakitKode: "P03", gejalaKode: "G28", cfValue: 1.0 },
  ]

  for (const rule of rulesData) {
    const penyakit = await prisma.penyakit.findUnique({ where: { kode: rule.penyakitKode } })
    const gejala = await prisma.gejala.findUnique({ where: { kode: rule.gejalaKode } })

    if (penyakit && gejala) {
      await prisma.rule.upsert({
        where: {
          penyakitId_gejalaId: {
            penyakitId: penyakit.id,
            gejalaId: gejala.id,
          },
        },
        update: { cfValue: rule.cfValue },
        create: {
          penyakitId: penyakit.id,
          gejalaId: gejala.id,
          cfValue: rule.cfValue,
        },
      })
    }
  }

  console.log("Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
