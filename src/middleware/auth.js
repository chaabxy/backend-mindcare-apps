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
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return h
        .response({
          success: false,
          message: "Token tidak ditemukan",
        })
        .code(401)
        .takeover();
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return h
        .response({
          success: false,
          message: "Token tidak valid",
        })
        .code(401)
        .takeover();
    }

    // Try JWT verification first
    try {
      const jwtSecret = getJWTSecret();
      const decoded = jwt.verify(token, jwtSecret);

      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id },
      });

      if (!admin) {
        return h
          .response({
            success: false,
            message: "Admin tidak ditemukan",
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

      return h.continue;
    } catch (jwtError) {
      // Fallback: check session token
      global.activeSessions = global.activeSessions || new Map();
      const session = global.activeSessions.get(token);

      if (!session) {
        return h
          .response({
            success: false,
            message: "Token tidak valid atau sudah expired",
          })
          .code(401)
          .takeover();
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        global.activeSessions.delete(token);
        return h
          .response({
            success: false,
            message: "Session sudah expired",
          })
          .code(401)
          .takeover();
      }

      // Get admin data
      const admin = await prisma.admin.findUnique({
        where: { id: session.adminId },
      });

      if (!admin) {
        global.activeSessions.delete(token);
        return h
          .response({
            success: false,
            message: "Admin tidak ditemukan",
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

      return h.continue;
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return h
      .response({
        success: false,
        message: "Unauthorized",
      })
      .code(401)
      .takeover();
  }
};

module.exports = authMiddleware;
