const express = require('express')
const router = express.Router()
const asyncHandler = require('../utils/asyncHandler')
const addressController = require('../controllers/addressController')

router.get('/lookup', asyncHandler(addressController.lookup))
router.get('/search', asyncHandler(addressController.search))

module.exports = router
