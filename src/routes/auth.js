const Joi = require("joi");
const AuthController = require("../controllers/auth");

const authRoutes = [
  {
    method: "POST",
    path: "/api/auth/login",
    handler: AuthController.login,
    options: {
      validate: {
        payload: Joi.object({
          username: Joi.string().required(),
          password: Joi.string().required(),
        }),
      },
      timeout: {
        server: 5000, // 5 seconds timeout for login
      },
    },
  },
  {
    method: "GET",
    path: "/api/auth/verify",
    handler: AuthController.verifyToken,
    options: {
      timeout: {
        server: 3000, // 3 seconds timeout for token verification
      },
    },
  },
  {
    method: "POST",
    path: "/api/auth/logout",
    handler: AuthController.logout,
    options: {
      timeout: {
        server: 3000,
      },
    },
  },
];

module.exports = authRoutes;
