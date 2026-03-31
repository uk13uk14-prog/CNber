const express = require('express')
const router = express.Router()
const dashboardController = require('../controllers/dashboardController')

router.get('/mobile-stats', dashboardController.getMobileStats)

module.exports = router
