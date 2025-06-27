const bcrypt = require("bcrypt");
const prisma = require("../config/database");

const AuthController = {
  async login(request, h) {
    try {
      const { username, password } = request.payload;

      console.log("=== LOGIN ATTEMPT ===");
      console.log("Username:", username);
      console.log("Timestamp:", new Date().toISOString());

      const admin = await prisma.admin.findUnique({
        where: { username },
      });

      if (!admin) {
        console.log("❌ Admin not found for username:", username);
        return h
          .response({
            success: false,
            message: "Username atau password salah",
          })
          .code(401);
      }

      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        console.log("❌ Invalid password for username:", username);
        return h
          .response({
            success: false,
            message: "Username atau password salah",
          })
          .code(401);
      }

      console.log("✅ Login successful for username:", username);

      return h
        .response({
          success: true,
          data: {
            admin: {
              id: admin.id,
              username: admin.username,
              name: admin.name,
            },
          },
          message: "Login berhasil",
        })
        .code(200);
    } catch (error) {
      console.error("❌ Login error:", error);
      return h
        .response({
          success: false,
          message: "Gagal login: " + error.message,
        })
        .code(500);
    }
  },

  async verifyToken(request, h) {
    try {
      console.log("=== AUTH VERIFICATION ===");
      console.log("Verification requested at:", new Date().toISOString());

      // Tidak ada validasi session, selalu return success
      // Frontend yang mengatur state login/logout
      return h
        .response({
          success: true,
          message: "Authentication verified",
        })
        .code(200);
    } catch (error) {
      console.error("❌ Verify error:", error);
      return h
        .response({
          success: false,
          message: "Gagal verifikasi: " + error.message,
        })
        .code(500);
    }
  },

  async logout(request, h) {
    try {
      console.log("=== LOGOUT REQUEST ===");
      console.log("Logout requested at:", new Date().toISOString());

      // Tidak ada session yang perlu dihapus
      // Logout hanya untuk memberikan response ke frontend
      console.log("✅ Logout successful");

      return h
        .response({
          success: true,
          message: "Logout berhasil",
        })
        .code(200);
    } catch (error) {
      console.error("❌ Logout error:", error);
      return h
        .response({
          success: false,
          message: "Gagal logout: " + error.message,
        })
        .code(500);
    }
  },
};

module.exports = AuthController;
