require("dotenv").config()
const { init } = require("./src/config/server")

process.on("unhandledRejection", (err) => {
  console.log(err)
  process.exit(1)
})

init()
