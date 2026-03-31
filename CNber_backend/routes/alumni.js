const express = require('express')
const router = express.Router()
const alumniController = require('../controllers/alumniController')

router.get('/list', alumniController.getAlumniList)

module.exports = router
