const bcrypt = require("bcrypt");
const prisma = require("../config/database");

const AuthController = {
  async login(request, h) {
    try {
      const { username, password } = request.payload;

      console.log("Login attempt for username:", username);

      const admin = await prisma.admin.findUnique({
        where: { username },
      });

      if (!admin) {
        console.log("Admin not found for username:", username);
        return h
          .response({
            success: false,
            message: "Username atau password salah",
          })
          .code(401);
      }

      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        console.log("Invalid password for username:", username);
        return h
          .response({
            success: false,
            message: "Username atau password salah",
          })
          .code(401);
      }

      console.log("Login successful for username:", username);

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
        })
        .code(200);
    } catch (error) {
      console.error("Login error:", error);
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
      // Since we removed JWT, we'll just return a simple success response
      // In a real application, you might want to implement session-based auth
      // or use a different authentication method

      return h
        .response({
          success: true,
          message: "Authentication not required",
        })
        .code(200);
    } catch (error) {
      console.error("Verify token error:", error);
      return h
        .response({
          success: false,
          message: "Gagal verifikasi",
        })
        .code(500);
    }
  },
};

module.exports = AuthController;
