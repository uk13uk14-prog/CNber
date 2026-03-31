// utils/send-sms.js
const Core = require('@alicloud/pop-core');

const client = new Core({
  accessKeyId: 'LTAI5tMm9ErRRo58XCmL1pdP',
  accessKeySecret: 'WOuxq3pWj4EW4KGKADxSk5tYKg9nT5',
  endpoint: 'https://dysmsapi.aliyuncs.com',
  apiVersion: '2017-05-25'
});

function sendSMS(phoneNumber, code) {
  const params = {
    RegionId: 'cn-hangzhou',
    PhoneNumbers: phoneNumber,
    SignName: '大兰说鸥洲',
    TemplateCode: 'SMS_319250394',
    TemplateParam: JSON.stringify({ code })
  };

  const requestOption = {
    method: 'POST'
  };

  return client.request('SendSms', params, requestOption);
}

module.exports = sendSMS;
