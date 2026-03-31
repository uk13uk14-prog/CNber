const sendSMS = require('./utils/send-sms');

// ⚠️ 替换成你自己的手机号，务必使用 +86 开头的完整格式，或直接 11 位手机号
const phoneNumber = '+8617898876656';
const code = Math.floor(100000 + Math.random() * 900000).toString();

sendSMS(phoneNumber, code)
  .then((res) => {
    console.log('测试短信已发送:', res);
  })
  .catch((err) => {
    console.error('短信发送失败:', err);
  });
