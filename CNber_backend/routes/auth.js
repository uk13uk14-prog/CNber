const express = require('express')
const router = express.Router()
const asyncHandler = require('../utils/asyncHandler')
const { loginLimiter } = require('../middlewares/rateLimit')
const authController = require('../controllers/authController')

router.post('/login', loginLimiter, asyncHandler(authController.login))
router.post('/register', asyncHandler(authController.register))

module.exports = router
