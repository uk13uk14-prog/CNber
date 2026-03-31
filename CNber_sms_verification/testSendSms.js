const sendSMS = require('./api/utils/send-sms');

const phone = '19512466656; // 例如 '13100001111'
const code = '123456'; // 测试用验证码

sendSMS(phone, code)
  .then((res) => {
    console.log('✅ 短信发送成功:', res);
  })
  .catch((err) => {
    console.log('❌ 短信发送失败:', err);
  });
