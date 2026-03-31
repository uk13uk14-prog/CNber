const express = require('express')
const router = express.Router()
const supportController = require('../controllers/supportController')

router.get('/list', supportController.getTickets)
router.post('/:id/resolve', supportController.markResolved)

module.exports = router
