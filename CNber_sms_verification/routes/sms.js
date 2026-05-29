// routes/sms.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const sendSMS = require('../utils/send-sms');
const generateCode = require('../utils/generateCode');

// 限制每分钟1次请求
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
});

router.post('/send-code', limiter, async (req, res) => {
  const { phoneNumber } = req.body;

  // 验证手机号格式（支持 +86 或 11 位国内号）
  if (!phoneNumber || !/^(\+86|86)?1[3-9]\d{9}$/.test(phoneNumber)) {
    return res.status(400).json({ message: '手机号格式错误' });
  }

  const code = generateCode();

  try {
    await sendSMS(phoneNumber, code);
    res.status(200).json({ message: '验证码已发送' }); // 生产环境不返回 code
  } catch (error) {
    console.error('短信发送失败:', error);
    res.status(500).json({ message: '发送失败，请重试' });
  }
});

module.exports = router;