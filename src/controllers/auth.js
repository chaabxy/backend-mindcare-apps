const bcrypt = require("bcrypt");
const prisma = require("../config/database");

// Simple session storage (in production, use Redis or database)
const sessions = new Map();

const AuthController = {
  async login(request, h) {
    try {
      const { username, password } = request.payload;

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

      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return h
          .response({
            success: false,
            message: "Username atau password salah",
          })
          .code(401);
      }

      // Generate simple session ID
      const sessionId = `session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Store session
      sessions.set(sessionId, {
        adminId: admin.id,
        username: admin.username,
        name: admin.name,
        createdAt: new Date(),
        lastAccess: new Date(),
      });

      // Set session cookie
      const response = h.response({
        success: true,
        data: {
          sessionId,
          admin: {
            id: admin.id,
            username: admin.username,
            name: admin.name,
          },
        },
      });

      // Set HTTP-only cookie for security
      response.state("admin_session", sessionId, {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        isSecure: process.env.NODE_ENV === "production",
        isHttpOnly: true,
        isSameSite: "Lax",
        path: "/",
      });

      return response.code(200);
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
      // Check for session ID in cookie or header
      const sessionId =
        request.state.admin_session ||
        request.headers.authorization?.replace("Bearer ", "");

      if (!sessionId) {
        return h
          .response({
            success: false,
            message: "Session tidak ditemukan",
          })
          .code(401);
      }

      const session = sessions.get(sessionId);

      if (!session) {
        return h
          .response({
            success: false,
            message: "Session tidak valid atau telah berakhir",
          })
          .code(401);
      }

      // Check if session is expired (24 hours)
      const now = new Date();
      const sessionAge = now - session.createdAt;
      if (sessionAge > 24 * 60 * 60 * 1000) {
        sessions.delete(sessionId);
        return h
          .response({
            success: false,
            message: "Session telah berakhir",
          })
          .code(401);
      }

      // Update last access time
      session.lastAccess = now;
      sessions.set(sessionId, session);

      // Get fresh admin data
      const admin = await prisma.admin.findUnique({
        where: { id: session.adminId },
      });

      if (!admin) {
        sessions.delete(sessionId);
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
      console.error("Verify session error:", error);
      return h
        .response({
          success: false,
          message: "Session tidak valid",
        })
        .code(401);
    }
  },

  async logout(request, h) {
    try {
      const sessionId =
        request.state.admin_session ||
        request.headers.authorization?.replace("Bearer ", "");

      if (sessionId) {
        sessions.delete(sessionId);
      }

      const response = h.response({
        success: true,
        message: "Berhasil logout",
      });

      // Clear session cookie
      response.unstate("admin_session");

      return response.code(200);
    } catch (error) {
      console.error("Logout error:", error);
      return h
        .response({
          success: false,
          message: "Gagal logout",
        })
        .code(500);
    }
  },
};

module.exports = AuthController;
