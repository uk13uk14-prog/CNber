// utils/send-sms.js
const Core = require('@alicloud/pop-core');

const client = new Core({
  accessKeyId: 'LTAI5tHzZ4EBjmb9QKfVJgGo',
  accessKeySecret: 'lAQ7cCPq1XwSC7Q5V41nNfwh2tGsAl2',
  endpoint: 'https://dysmsapi.aliyuncs.com',
  apiVersion: '2017-05-25'
});

function sendSMS(phoneNumber, code) {
  const params = {
    RegionId: 'cn-hangzhou',
    PhoneNumbers: phoneNumber,
    SignName: '大兰说欧洲',
    TemplateCode: 'SMS_319250394',
    TemplateParam: JSON.stringify({ code: code })
  };

  const requestOption = {
    method: 'POST'
  };

  return client.request('SendSms', params, requestOption)
    .then((result) => {
      console.log('短信发送成功:', result);
      return result;
    })
    .catch((ex) => {
      console.error('短信发送失败:', ex);
      throw ex;
    });
}

module.exports = sendSMS;
