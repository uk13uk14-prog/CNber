// utils/send-sms.js
const Core = require('@alicloud/pop-core');

const {
  ALICLOUD_ACCESS_KEY_ID,
  ALICLOUD_ACCESS_KEY_SECRET,
  ALICLOUD_SMS_REGION = 'cn-hangzhou',
  ALICLOUD_SMS_SIGN_NAME,
  ALICLOUD_SMS_TEMPLATE_CODE
} = process.env;

if (!ALICLOUD_ACCESS_KEY_ID || !ALICLOUD_ACCESS_KEY_SECRET) {
  throw new Error('ALICLOUD_ACCESS_KEY_ID and ALICLOUD_ACCESS_KEY_SECRET are required');
}

if (!ALICLOUD_SMS_SIGN_NAME || !ALICLOUD_SMS_TEMPLATE_CODE) {
  throw new Error('ALICLOUD_SMS_SIGN_NAME and ALICLOUD_SMS_TEMPLATE_CODE are required');
}

const client = new Core({
  accessKeyId: ALICLOUD_ACCESS_KEY_ID,
  accessKeySecret: ALICLOUD_ACCESS_KEY_SECRET,
  endpoint: 'https://dysmsapi.aliyuncs.com',
  apiVersion: '2017-05-25'
});

function sendSMS(phoneNumber, code) {
  const params = {
    RegionId: ALICLOUD_SMS_REGION,
    PhoneNumbers: phoneNumber,
    SignName: ALICLOUD_SMS_SIGN_NAME,
    TemplateCode: ALICLOUD_SMS_TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code })
  };

  const requestOption = {
    method: 'POST'
  };

  return client.request('SendSms', params, requestOption);
}

module.exports = sendSMS;
