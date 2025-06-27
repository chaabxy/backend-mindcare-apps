const bcrypt = require("bcrypt");
const prisma = require("../config/database");

// Simple session storage (in production, use Redis or database)
const sessions = new Map();

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

      console.log("Session created:", sessionId);
      console.log("Total active sessions:", sessions.size);

      return h
        .response({
          success: true,
          data: {
            sessionId,
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
      // Check for session ID in Authorization header (since cookies might not work in production)
      const authHeader = request.headers.authorization;
      const sessionId = authHeader ? authHeader.replace("Bearer ", "") : null;

      console.log("Verify session attempt with sessionId:", sessionId);
      console.log("Available sessions:", Array.from(sessions.keys()));

      if (!sessionId) {
        console.log("No session ID provided");
        return h
          .response({
            success: false,
            message: "Session tidak ditemukan",
          })
          .code(401);
      }

      const session = sessions.get(sessionId);

      if (!session) {
        console.log("Session not found in storage:", sessionId);
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
        console.log("Session expired:", sessionId);
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
        console.log("Admin not found for session:", sessionId);
        sessions.delete(sessionId);
        return h
          .response({
            success: false,
            message: "Admin tidak ditemukan",
          })
          .code(401);
      }

      console.log("Session verified successfully for:", admin.username);

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
      const authHeader = request.headers.authorization;
      const sessionId = authHeader ? authHeader.replace("Bearer ", "") : null;

      if (sessionId) {
        sessions.delete(sessionId);
        console.log("Session deleted:", sessionId);
      }

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
          message: "Gagal logout",
        })
        .code(500);
    }
  },
};

module.exports = AuthController;
