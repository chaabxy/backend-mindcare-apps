const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/database");

const AuthController = {
  async login(request, h) {
    try {
      const { username, password } = request.payload;

      // Basic validation
      if (!username || !password) {
        return h
          .response({
            success: false,
            message: "Username dan password wajib diisi",
          })
          .code(400);
      }

      // Check JWT_SECRET
      if (!process.env.JWT_SECRET) {
        return h
          .response({
            success: false,
            message: "Server configuration error",
          })
          .code(500);
      }

      // Find admin
      const admin = await prisma.admin.findUnique({
        where: { username },
      });

      if (!admin) {
        return h
          .response({
            success: false,
            message: "Username atau password salah",
          })
          .code(401);
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return h
          .response({
            success: false,
            message: "Username atau password salah",
          })
          .code(401);
      }

      // Generate token
      const token = jwt.sign(
        { id: admin.id, username: admin.username },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      return h
        .response({
          success: true,
          data: {
            token,
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
          message: "Gagal login",
        })
        .code(500);
    }
  },

  async verifyToken(request, h) {
    try {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return h
          .response({
            success: false,
            message: "Token tidak ditemukan",
          })
          .code(401);
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id },
      });

      if (!admin) {
        return h
          .response({
            success: false,
            message: "Admin tidak ditemukan",
          })
          .code(401);
      }

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
      return h
        .response({
          success: false,
          message: "Token tidak valid",
        })
        .code(401);
    }
  },
};

module.exports = AuthController;
