// config/aliyun.js

module.exports = {
  accessKeyId: process.env.ALICLOUD_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALICLOUD_ACCESS_KEY_SECRET,
  signName: process.env.ALICLOUD_SMS_SIGN_NAME,
  templateCode: process.env.ALICLOUD_SMS_TEMPLATE_CODE
};
