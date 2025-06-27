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
    },
  },
  {
    method: "GET",
    path: "/api/auth/verify",
    handler: AuthController.verifyToken,
  },
  {
    method: "POST",
    path: "/api/auth/verify",
    handler: AuthController.verifyToken,
    options: {
      validate: {
        payload: Joi.object({
          sessionToken: Joi.string().optional(),
        }).unknown(true),
      },
    },
  },
  {
    method: "POST",
    path: "/api/auth/logout",
    handler: AuthController.logout,
  },
  {
    method: "GET",
    path: "/api/auth/logout",
    handler: AuthController.logout,
  },
  // Debug route untuk melihat session aktif
  {
    method: "GET",
    path: "/api/auth/debug/sessions",
    handler: (request, h) => {
      const AuthController = require("../controllers/auth");
      return h.response({
        success: true,
        data: {
          activeSessions: AuthController.getActiveSessionsInfo(),
          totalSessions: AuthController.getActiveSessionsInfo().length,
        },
      });
    },
  },
];

module.exports = authRoutes;
