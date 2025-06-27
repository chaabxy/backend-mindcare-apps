const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/database");

const AuthController = {
  async login(request, h) {
    try {
      console.log("Login attempt started:", new Date().toISOString());
      const { username, password } = request.payload;

      // Check if JWT_SECRET exists
      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET environment variable is not set");
        return h
          .response({
            success: false,
            message: "Server configuration error",
          })
          .code(500);
      }

      console.log("Looking for admin with username:", username);
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

      console.log("Admin found, checking password...");
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

      console.log("Password valid, generating token...");
      const token = jwt.sign(
        { id: admin.id, username: admin.username },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      console.log("Login successful for username:", username);
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
      console.error("Login error details:", {
        message: error.message,
        stack: error.stack,
        code: error.code,
        timestamp: new Date().toISOString(),
      });

      // Handle specific Prisma errors
      if (error.code === "P2028") {
        return h
          .response({
            success: false,
            message: "Database timeout - silakan coba lagi",
          })
          .code(500);
      }

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
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return h
          .response({
            success: false,
            message: "Token tidak ditemukan",
          })
          .code(401);
      }

      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET environment variable is not set");
        return h
          .response({
            success: false,
            message: "Server configuration error",
          })
          .code(500);
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
      console.error("Token verification error:", error.message);
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
