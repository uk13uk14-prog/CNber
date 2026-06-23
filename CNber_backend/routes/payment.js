const express = require('express')
const router = express.Router()
const asyncHandler = require('../utils/asyncHandler')
const paymentPublicController = require('../controllers/paymentPublicController')

function allowUserOrAdmin(req, res, next) {
  if (!req.user || !['user', 'admin'].includes(req.user.role)) {
    const e = new Error('Forbidden')
    e.code = 403
    return next(e)
  }
  next()
}

router.get('/accounts', allowUserOrAdmin, asyncHandler(paymentPublicController.listAccountsByScene))

module.exports = router
