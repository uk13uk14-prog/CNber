const express = require('express')
const router = express.Router()
const aiController = require('../controllers/aiController')

router.get('/logs', aiController.getLogs)

module.exports = router
router.post('/restart', async (req, res) => {
  console.log('AI 模型重启指令已发出（模拟）')
  res.json({ message: 'AI 客服重启成功' })
})
