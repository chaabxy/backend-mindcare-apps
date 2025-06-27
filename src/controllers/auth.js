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

      console.log("Login attempt for username:", username);

      // Validate input
      if (!username || !password) {
        return h
          .response({
            success: false,
            message: "Username dan password wajib diisi",
          })
          .code(400);
      }

      const admin = await prisma.admin.findUnique({
        where: { username },
      });

      if (!admin) {
        console.log("Admin not found:", username);
        return h
          .response({
            success: false,
            message: "Username atau password salah",
          })
          .code(401);
      }

      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        console.log("Invalid password for:", username);
        return h
          .response({
            success: false,
            message: "Username atau password salah",
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

        console.log("Login successful for:", username);

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
        console.error("JWT signing error:", jwtError);

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

        console.log("Using fallback session token for:", username);

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
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        return h
          .response({
            success: false,
            message: "Token tidak ditemukan",
          })
          .code(401);
      }

      const token = authHeader.replace("Bearer ", "");

      if (!token) {
        return h
          .response({
            success: false,
            message: "Token tidak valid",
          })
          .code(401);
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
        console.log("JWT verification failed, trying session fallback");

        // Fallback: check session token
        global.activeSessions = global.activeSessions || new Map();
        const session = global.activeSessions.get(token);

        if (!session) {
          return h
            .response({
              success: false,
              message: "Token tidak valid atau sudah expired",
            })
            .code(401);
        }

        // Check if session is expired
        if (new Date() > session.expiresAt) {
          global.activeSessions.delete(token);
          return h
            .response({
              success: false,
              message: "Session sudah expired",
            })
            .code(401);
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
      console.error("Token verification error:", error);
      return h
        .response({
          success: false,
          message: "Token tidak valid",
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
        }
      }

      return h
        .response({
          success: true,
          message: "Logout berhasil",
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
