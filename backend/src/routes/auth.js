const Joi = require("joi")
const AuthController = require("../controllers/auth")

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
]

module.exports = authRoutes
