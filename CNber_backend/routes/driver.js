const express = require('express')
const router = express.Router()
const driverController = require('../controllers/driverController')

router.get('/list', driverController.getDriverList)
router.post('/:id/approve', driverController.approveDriver)
router.post('/:id/reject', driverController.rejectDriver)
router.post('/:id/ban', driverController.banDriver)

module.exports = router
