const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')

router.get('/list', userController.getUserList)
router.post('/:id/ban', userController.banUser)
router.post('/:id/unban', userController.unbanUser)

module.exports = router
