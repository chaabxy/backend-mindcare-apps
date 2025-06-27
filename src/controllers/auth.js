const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/database");

const AuthController = {
  async login(request, h) {
    console.log("=== LOGIN REQUEST STARTED ===");

    try {
      const { username, password } = request.payload;
      console.log("Login attempt for username:", username);

      // Validate input
      if (!username || !password) {
        console.log("Missing username or password");
        return h
          .response({
            success: false,
            message: "Username dan password wajib diisi",
          })
          .code(400);
      }

      // Check JWT_SECRET
      if (!process.env.JWT_SECRET) {
        console.error("❌ JWT_SECRET environment variable is missing");
        return h
          .response({
            success: false,
            message: "Server configuration error - JWT_SECRET missing",
          })
          .code(500);
      }

      // Check database connection
      try {
        await prisma.$connect();
        console.log("✅ Database connection OK");
      } catch (dbError) {
        console.error("❌ Database connection failed:", dbError.message);
        return h
          .response({
            success: false,
            message: "Database connection error",
          })
          .code(500);
      }

      // Find admin with timeout
      console.log("Searching for admin...");
      let admin;
      try {
        admin = await Promise.race([
          prisma.admin.findUnique({
            where: { username: username.trim() },
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Database query timeout")), 10000)
          ),
        ]);
        console.log("Admin search completed:", admin ? "Found" : "Not found");
      } catch (dbError) {
        console.error("❌ Database query error:", dbError.message);
        return h
          .response({
            success: false,
            message: "Database query failed: " + dbError.message,
          })
          .code(500);
      }

      if (!admin) {
        console.log("❌ Admin not found");
        return h
          .response({
            success: false,
            message: "Username atau password salah",
          })
          .code(401);
      }

      // Verify password
      console.log("Verifying password...");
      let isValidPassword;
      try {
        isValidPassword = await bcrypt.compare(password, admin.password);
        console.log(
          "Password verification:",
          isValidPassword ? "Valid" : "Invalid"
        );
      } catch (bcryptError) {
        console.error("❌ Password verification error:", bcryptError.message);
        return h
          .response({
            success: false,
            message: "Password verification failed",
          })
          .code(500);
      }

      if (!isValidPassword) {
        console.log("❌ Invalid password");
        return h
          .response({
            success: false,
            message: "Username atau password salah",
          })
          .code(401);
      }

      // Generate token
      console.log("Generating JWT token...");
      let token;
      try {
        token = jwt.sign(
          { id: admin.id, username: admin.username },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );
        console.log("✅ Token generated successfully");
      } catch (jwtError) {
        console.error("❌ JWT generation error:", jwtError.message);
        return h
          .response({
            success: false,
            message: "Token generation failed",
          })
          .code(500);
      }

      console.log("✅ LOGIN SUCCESSFUL");
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
      console.error("❌ UNEXPECTED LOGIN ERROR:", error);
      console.error("Error stack:", error.stack);

      return h
        .response({
          success: false,
          message: "Login failed: " + error.message,
          error:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        })
        .code(500);
    }
  },

  async verifyToken(request, h) {
    try {
      const authHeader = request.headers.authorization;
      console.log("Auth header:", authHeader ? "Present" : "Missing");

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return h
          .response({
            success: false,
            message: "Token tidak ditemukan atau format salah",
          })
          .code(401);
      }

      const token = authHeader.replace("Bearer ", "");

      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET missing in token verification");
        return h
          .response({
            success: false,
            message: "Server configuration error",
          })
          .code(500);
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (jwtError) {
        console.error("JWT verification failed:", jwtError.message);
        return h
          .response({
            success: false,
            message: "Token tidak valid atau expired",
          })
          .code(401);
      }

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
      console.error("Token verification error:", error);
      return h
        .response({
          success: false,
          message: "Token verification failed: " + error.message,
        })
        .code(500);
    }
  },
};

module.exports = AuthController;
