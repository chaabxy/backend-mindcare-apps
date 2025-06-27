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
    path: "/api/auth/logout",
    handler: AuthController.logout,
    options: {
      validate: {
        payload: Joi.object({
          sessionId: Joi.string().optional(),
        }).allow(null),
      },
    },
  },
];

module.exports = authRoutes;
