const express = require('express')
const router = express.Router()
const logController = require('../controllers/logController')

router.get('/analytics', logController.getAnalytics)

module.exports = router
