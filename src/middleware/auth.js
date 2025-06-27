const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../config/database");

// Generate a fallback secret if JWT_SECRET is not set
const getJWTSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  console.warn(
    "JWT_SECRET not found in environment variables. Using generated secret."
  );
  return crypto.randomBytes(64).toString("hex");
};

const authMiddleware = async (request, h) => {
  try {
    console.log(
      `[AUTH] Checking authentication for ${request.method} ${request.path}`
    );

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      console.log("[AUTH] No authorization header found");
      return h
        .response({
          success: false,
          message: "Token tidak ditemukan",
          code: "NO_TOKEN",
        })
        .code(401)
        .takeover();
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token || token === "null" || token === "undefined") {
      console.log("[AUTH] Invalid token format");
      return h
        .response({
          success: false,
          message: "Token tidak valid",
          code: "INVALID_TOKEN",
        })
        .code(401)
        .takeover();
    }

    console.log("[AUTH] Token found, verifying...");

    // Try JWT verification first
    try {
      const jwtSecret = getJWTSecret();
      const decoded = jwt.verify(token, jwtSecret);

      console.log(
        "[AUTH] JWT verification successful for user:",
        decoded.username
      );

      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id },
      });

      if (!admin) {
        console.log("[AUTH] Admin not found in database:", decoded.id);
        return h
          .response({
            success: false,
            message: "Admin tidak ditemukan",
            code: "ADMIN_NOT_FOUND",
          })
          .code(401)
          .takeover();
      }

      // Add admin info to request
      request.auth = {
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
        },
      };

      console.log("[AUTH] Authentication successful for:", admin.username);
      return h.continue;
    } catch (jwtError) {
      console.log("[AUTH] JWT verification failed:", jwtError.message);
      console.log("[AUTH] Trying session fallback...");

      // Fallback: check session token
      global.activeSessions = global.activeSessions || new Map();
      const session = global.activeSessions.get(token);

      if (!session) {
        console.log("[AUTH] Session not found");
        return h
          .response({
            success: false,
            message: "Token tidak valid atau sudah expired",
            code: "SESSION_NOT_FOUND",
          })
          .code(401)
          .takeover();
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        console.log("[AUTH] Session expired");
        global.activeSessions.delete(token);
        return h
          .response({
            success: false,
            message: "Session sudah expired",
            code: "SESSION_EXPIRED",
          })
          .code(401)
          .takeover();
      }

      // Get admin data
      const admin = await prisma.admin.findUnique({
        where: { id: session.adminId },
      });

      if (!admin) {
        console.log("[AUTH] Admin not found for session:", session.adminId);
        global.activeSessions.delete(token);
        return h
          .response({
            success: false,
            message: "Admin tidak ditemukan",
            code: "ADMIN_NOT_FOUND",
          })
          .code(401)
          .takeover();
      }

      // Add admin info to request
      request.auth = {
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
        },
      };

      console.log(
        "[AUTH] Session authentication successful for:",
        admin.username
      );
      return h.continue;
    }
  } catch (error) {
    console.error("[AUTH] Authentication middleware error:", error);
    return h
      .response({
        success: false,
        message: "Unauthorized",
        code: "AUTH_ERROR",
      })
      .code(401)
      .takeover();
  }
};

module.exports = authMiddleware;
