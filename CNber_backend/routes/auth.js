const express = require('express')
const router = express.Router()
const asyncHandler = require('../utils/asyncHandler')
const { loginLimiter, registerLimiter } = require('../middlewares/rateLimit')
const authController = require('../controllers/authController')

router.post('/login', loginLimiter, asyncHandler(authController.login))
router.post('/register', registerLimiter, asyncHandler(authController.register))

module.exports = router
