const bcrypt = require("bcrypt");
const prisma = require("../config/database");
const crypto = require("crypto");

// Simple in-memory session storage
const sessions = new Map();

// Session cleanup interval (run every hour)
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(sessionId);
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) {
    console.log(
      `Cleaned up ${cleanedCount} expired sessions. Active sessions: ${sessions.size}`
    );
  }
}, 60 * 60 * 1000); // 1 hour

// Helper function to generate session ID
function generateSessionId() {
  return crypto.randomBytes(32).toString("hex");
}

// Helper function to create session
function createSession(adminId, adminData) {
  const sessionId = generateSessionId();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  sessions.set(sessionId, {
    adminId,
    adminData,
    createdAt: Date.now(),
    expiresAt,
  });

  console.log(
    `Session created for ${adminData.username}:`,
    sessionId.substring(0, 8) + "...",
    "expires at:",
    new Date(expiresAt).toISOString()
  );
  console.log(`Total active sessions: ${sessions.size}`);
  return { sessionId, expiresAt };
}

// Helper function to validate session
function validateSession(sessionId) {
  if (!sessionId) {
    return null;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  if (session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    console.log(
      "Session expired and removed:",
      sessionId.substring(0, 8) + "..."
    );
    return null;
  }

  return session;
}

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

      // Create session
      const adminData = {
        id: admin.id,
        username: admin.username,
        name: admin.name,
      };

      const { sessionId, expiresAt } = createSession(admin.id, adminData);

      return h
        .response({
          success: true,
          data: {
            sessionId,
            expiresAt,
            admin: adminData,
          },
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
      console.log("=== SESSION VERIFICATION ===");

      const sessionId =
        request.headers.authorization?.replace("Bearer ", "") ||
        request.headers.sessionid ||
        request.query.sessionId;

      if (!sessionId) {
        console.log("❌ No session ID provided");
        return h
          .response({
            success: false,
            message: "Session ID tidak ditemukan",
          })
          .code(401);
      }

      console.log("Verifying session:", sessionId.substring(0, 8) + "...");

      const session = validateSession(sessionId);
      if (!session) {
        console.log("❌ Session not valid or expired");
        return h
          .response({
            success: false,
            message: "Session tidak valid atau sudah expired",
          })
          .code(401);
      }

      console.log(
        "✅ Session validated for admin:",
        session.adminData.username
      );
      console.log(
        "Session expires at:",
        new Date(session.expiresAt).toISOString()
      );

      return h
        .response({
          success: true,
          data: {
            admin: session.adminData,
            sessionId,
            expiresAt: session.expiresAt,
          },
        })
        .code(200);
    } catch (error) {
      console.error("❌ Verify session error:", error);
      return h
        .response({
          success: false,
          message: "Gagal verifikasi session: " + error.message,
        })
        .code(500);
    }
  },

  async logout(request, h) {
    try {
      console.log("=== LOGOUT REQUEST ===");

      const sessionId =
        request.headers.authorization?.replace("Bearer ", "") ||
        request.headers.sessionid ||
        request.payload?.sessionId;

      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        sessions.delete(sessionId);
        console.log("✅ Session logged out for:", session.adminData.username);
        console.log("Session ID:", sessionId.substring(0, 8) + "...");
      } else {
        console.log("⚠️ No valid session found to logout");
      }

      console.log(`Total active sessions after logout: ${sessions.size}`);

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
