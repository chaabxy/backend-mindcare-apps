const bcrypt = require("bcrypt");
const { prisma } = require("../config/database");

// Simple in-memory session store (untuk development)
// Dalam production sebaiknya gunakan Redis atau database
const activeSessions = new Map();

// Generate simple session token
function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Session timeout (24 hours)
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

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

      // Generate session token
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + SESSION_TIMEOUT);

      // Store session
      activeSessions.set(sessionToken, {
        adminId: admin.id,
        username: admin.username,
        name: admin.name,
        createdAt: new Date(),
        expiresAt: expiresAt,
        lastActivity: new Date(),
      });

      console.log("✅ Login successful for username:", username);
      console.log(
        "Session token generated:",
        sessionToken.substring(0, 10) + "..."
      );
      console.log("Session expires at:", expiresAt.toISOString());

      return h
        .response({
          success: true,
          data: {
            admin: {
              id: admin.id,
              username: admin.username,
              name: admin.name,
            },
            sessionToken: sessionToken,
            expiresAt: expiresAt.toISOString(),
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

      const authHeader = request.headers.authorization;
      const sessionToken =
        request.headers["x-session-token"] ||
        request.query.sessionToken ||
        (authHeader && authHeader.replace("Bearer ", ""));

      if (!sessionToken) {
        console.log("❌ No session token provided");
        return h
          .response({
            success: false,
            message: "Token tidak ditemukan",
          })
          .code(401);
      }

      const session = activeSessions.get(sessionToken);
      if (!session) {
        console.log(
          "❌ Session not found for token:",
          sessionToken.substring(0, 10) + "..."
        );
        return h
          .response({
            success: false,
            message: "Session tidak valid",
          })
          .code(401);
      }

      // Check if session expired
      if (new Date() > session.expiresAt) {
        console.log("❌ Session expired for user:", session.username);
        activeSessions.delete(sessionToken);
        return h
          .response({
            success: false,
            message: "Session telah berakhir",
          })
          .code(401);
      }

      // Update last activity
      session.lastActivity = new Date();
      activeSessions.set(sessionToken, session);

      console.log("✅ Session valid for user:", session.username);
      console.log("Session expires at:", session.expiresAt.toISOString());

      return h
        .response({
          success: true,
          data: {
            admin: {
              id: session.adminId,
              username: session.username,
              name: session.name,
            },
            sessionToken: sessionToken,
            expiresAt: session.expiresAt.toISOString(),
          },
          message: "Session valid",
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

      const authHeader = request.headers.authorization;
      const sessionToken =
        request.headers["x-session-token"] ||
        request.query.sessionToken ||
        (authHeader && authHeader.replace("Bearer ", ""));

      if (sessionToken && activeSessions.has(sessionToken)) {
        const session = activeSessions.get(sessionToken);
        console.log("Removing session for user:", session.username);
        activeSessions.delete(sessionToken);
      }

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

  // Method untuk membersihkan session yang expired
  cleanupExpiredSessions() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [token, session] of activeSessions.entries()) {
      if (now > session.expiresAt) {
        activeSessions.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`);
    }

    return cleanedCount;
  },

  // Method untuk mendapatkan info session aktif (untuk debugging)
  getActiveSessionsInfo() {
    const sessions = [];
    for (const [token, session] of activeSessions.entries()) {
      sessions.push({
        token: token.substring(0, 10) + "...",
        username: session.username,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActivity: session.lastActivity,
      });
    }
    return sessions;
  },
};

// Cleanup expired sessions every 30 minutes
setInterval(() => {
  AuthController.cleanupExpiredSessions();
}, 30 * 60 * 1000);

module.exports = AuthController;
