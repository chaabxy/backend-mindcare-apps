const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../config/database");

// Generate a fallback secret if JWT_SECRET is not set
const getJWTSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  // Generate a random secret for this session (not recommended for production)
  console.warn(
    "JWT_SECRET not found in environment variables. Using generated secret."
  );
  return crypto.randomBytes(64).toString("hex");
};

const AuthController = {
  async login(request, h) {
    try {
      const { username, password } = request.payload;

      console.log("[LOGIN] Login attempt for username:", username);

      // Validate input
      if (!username || !password) {
        return h
          .response({
            success: false,
            message: "Username dan password wajib diisi",
            code: "MISSING_CREDENTIALS",
          })
          .code(400);
      }

      // Add timeout protection for database query
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Database timeout")), 5000);
      });

      const adminPromise = prisma.admin.findUnique({
        where: { username },
      });

      const admin = await Promise.race([adminPromise, timeoutPromise]);

      if (!admin) {
        console.log("[LOGIN] Admin not found:", username);
        return h
          .response({
            success: false,
            message: "Username atau password salah",
            code: "INVALID_CREDENTIALS",
          })
          .code(401);
      }

      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        console.log("[LOGIN] Invalid password for:", username);
        return h
          .response({
            success: false,
            message: "Username atau password salah",
            code: "INVALID_CREDENTIALS",
          })
          .code(401);
      }

      // Get JWT secret with fallback
      const jwtSecret = getJWTSecret();

      try {
        const token = jwt.sign(
          {
            id: admin.id,
            username: admin.username,
            loginTime: new Date().toISOString(),
          },
          jwtSecret,
          { expiresIn: "24h" }
        );

        console.log("[LOGIN] Login successful for:", username);

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
      } catch (jwtError) {
        console.error("[LOGIN] JWT signing error:", jwtError);

        // Fallback: create a simple session token
        const sessionToken = crypto.randomBytes(32).toString("hex");

        // Store session in memory (in production, use Redis or database)
        global.activeSessions = global.activeSessions || new Map();
        global.activeSessions.set(sessionToken, {
          adminId: admin.id,
          username: admin.username,
          loginTime: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        });

        console.log("[LOGIN] Using fallback session token for:", username);

        return h
          .response({
            success: true,
            data: {
              token: sessionToken,
              admin: {
                id: admin.id,
                username: admin.username,
                name: admin.name,
              },
            },
          })
          .code(200);
      }
    } catch (error) {
      console.error("[LOGIN] Login error:", error);

      if (error.message === "Database timeout") {
        return h
          .response({
            success: false,
            message: "Login timeout - silakan coba lagi",
            code: "TIMEOUT",
          })
          .code(408);
      }

      return h
        .response({
          success: false,
          message: "Gagal login: " + error.message,
          code: "LOGIN_ERROR",
        })
        .code(500);
    }
  },

  async verifyToken(request, h) {
    try {
      const authHeader = request.headers.authorization;

      console.log("[VERIFY] Token verification request");

      if (!authHeader) {
        console.log("[VERIFY] No authorization header");
        return h
          .response({
            success: false,
            message: "Token tidak ditemukan",
            code: "NO_TOKEN",
          })
          .code(401);
      }

      const token = authHeader.replace("Bearer ", "");

      if (!token || token === "null" || token === "undefined") {
        console.log("[VERIFY] Invalid token format");
        return h
          .response({
            success: false,
            message: "Token tidak valid",
            code: "INVALID_TOKEN",
          })
          .code(401);
      }

      // Try JWT verification first
      try {
        const jwtSecret = getJWTSecret();
        const decoded = jwt.verify(token, jwtSecret);

        console.log("[VERIFY] JWT verification successful");

        // Add timeout protection
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Database timeout")), 3000);
        });

        const adminPromise = prisma.admin.findUnique({
          where: { id: decoded.id },
        });

        const admin = await Promise.race([adminPromise, timeoutPromise]);

        if (!admin) {
          console.log("[VERIFY] Admin not found");
          return h
            .response({
              success: false,
              message: "Admin tidak ditemukan",
              code: "ADMIN_NOT_FOUND",
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
      } catch (jwtError) {
        console.log("[VERIFY] JWT verification failed, trying session");

        // Fallback: check session token
        global.activeSessions = global.activeSessions || new Map();
        const session = global.activeSessions.get(token);

        if (!session) {
          console.log("[VERIFY] Session not found");
          return h
            .response({
              success: false,
              message: "Token tidak valid atau sudah expired",
              code: "SESSION_NOT_FOUND",
            })
            .code(401);
        }

        // Check if session is expired
        if (new Date() > session.expiresAt) {
          console.log("[VERIFY] Session expired");
          global.activeSessions.delete(token);
          return h
            .response({
              success: false,
              message: "Session sudah expired",
              code: "SESSION_EXPIRED",
            })
            .code(401);
        }

        // Get admin data with timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Database timeout")), 3000);
        });

        const adminPromise = prisma.admin.findUnique({
          where: { id: session.adminId },
        });

        const admin = await Promise.race([adminPromise, timeoutPromise]);

        if (!admin) {
          console.log("[VERIFY] Admin not found for session");
          global.activeSessions.delete(token);
          return h
            .response({
              success: false,
              message: "Admin tidak ditemukan",
              code: "ADMIN_NOT_FOUND",
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
      }
    } catch (error) {
      console.error("[VERIFY] Token verification error:", error);

      if (error.message === "Database timeout") {
        return h
          .response({
            success: false,
            message: "Verification timeout - silakan coba lagi",
            code: "TIMEOUT",
          })
          .code(408);
      }

      return h
        .response({
          success: false,
          message: "Token tidak valid",
          code: "VERIFICATION_ERROR",
        })
        .code(401);
    }
  },

  async logout(request, h) {
    try {
      const authHeader = request.headers.authorization;

      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");

        // Remove from active sessions if using fallback
        if (global.activeSessions) {
          global.activeSessions.delete(token);
          console.log("[LOGOUT] Session removed");
        }
      }

      return h
        .response({
          success: true,
          message: "Logout berhasil",
        })
        .code(200);
    } catch (error) {
      console.error("[LOGOUT] Logout error:", error);
      return h
        .response({
          success: false,
          message: "Gagal logout",
          code: "LOGOUT_ERROR",
        })
        .code(500);
    }
  },
};

module.exports = AuthController;
