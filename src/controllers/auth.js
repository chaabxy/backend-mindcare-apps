const bcrypt = require("bcrypt");
const prisma = require("../config/database");
const crypto = require("crypto");

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

      // Create simple token with admin info and timestamp
      const tokenData = {
        adminId: admin.id,
        username: admin.username,
        name: admin.name,
        loginTime: Date.now(),
      };

      // Simple base64 encoding (not for security, just for transport)
      const token = Buffer.from(JSON.stringify(tokenData)).toString("base64");

      console.log("Login successful for:", admin.username);

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
          message: "Gagal login: " + error.message,
        })
        .code(500);
    }
  },

  async verifyToken(request, h) {
    try {
      // Check for token in Authorization header
      const authHeader = request.headers.authorization;
      const token = authHeader ? authHeader.replace("Bearer ", "") : null;

      console.log("Verify token attempt");

      if (!token) {
        console.log("No token provided");
        return h
          .response({
            success: false,
            message: "Token tidak ditemukan",
          })
          .code(401);
      }

      // Decode token
      let tokenData;
      try {
        const decoded = Buffer.from(token, "base64").toString("utf-8");
        tokenData = JSON.parse(decoded);
      } catch (decodeError) {
        console.log("Invalid token format");
        return h
          .response({
            success: false,
            message: "Token tidak valid",
          })
          .code(401);
      }

      // Verify admin still exists in database
      const admin = await prisma.admin.findUnique({
        where: { id: tokenData.adminId },
      });

      if (!admin) {
        console.log("Admin not found for token");
        return h
          .response({
            success: false,
            message: "Admin tidak ditemukan",
          })
          .code(401);
      }

      // Optional: Check if token is too old (24 hours)
      const tokenAge = Date.now() - tokenData.loginTime;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (tokenAge > maxAge) {
        console.log("Token expired");
        return h
          .response({
            success: false,
            message: "Token telah berakhir, silakan login ulang",
          })
          .code(401);
      }

      console.log("Token verified successfully for:", admin.username);

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
      console.error("Verify token error:", error);
      return h
        .response({
          success: false,
          message: "Token tidak valid: " + error.message,
        })
        .code(401);
    }
  },

  async logout(request, h) {
    try {
      // Logout hanya menghapus token di client side
      // Server tidak perlu melakukan apa-apa
      console.log("Logout request received");

      return h
        .response({
          success: true,
          message: "Berhasil logout",
        })
        .code(200);
    } catch (error) {
      console.error("Logout error:", error);
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
