
# CNber SMS Verification Server

## 功能
- 發送手機短信驗證碼
- 驗證輸入的驗證碼是否正確
- 使用 Twilio 實時發送
- 驗證碼 5 分鐘內有效

## 使用方法

1. 安裝依賴
```
npm install
```

2. 啟動伺服器
```
node app.js
```

3. API 路徑
- 發送驗證碼：POST /api/sms/send-code
- 驗證驗證碼：POST /api/sms/verify-code

## .env 配置
```
TWILIO_ACCOUNT_SID=你的SID
TWILIO_AUTH_TOKEN=你的TOKEN
TWILIO_PHONE_NUMBER=你的發送號碼
PORT=3200
```
