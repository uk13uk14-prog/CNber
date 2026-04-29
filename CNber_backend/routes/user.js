const express = require('express')
const router = express.Router()
const asyncHandler = require('../utils/asyncHandler')
const userController = require('../controllers/userController')

router.get('/list', asyncHandler(userController.getUserList))
router.post('/:id/ban', asyncHandler(userController.banUser))
router.post('/:id/unban', asyncHandler(userController.unbanUser))

module.exports = router
