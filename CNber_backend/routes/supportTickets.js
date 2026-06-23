const express = require('express')

const router = express.Router()

const asyncHandler = require('../utils/asyncHandler')

const { checkRole } = require('../middlewares/authMiddleware')

const supportTicketController = require('../controllers/supportTicketController')



const END_USER = checkRole('user', 'driver')



router.get('/my', END_USER, asyncHandler(supportTicketController.listMySupportTickets))

router.get('/:id', END_USER, asyncHandler(supportTicketController.getMySupportTicket))

router.post('/', END_USER, asyncHandler(supportTicketController.createEndUserSupportTicket))



module.exports = router

