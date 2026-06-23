# CNber P0 预约制试运营闭环

## 定位

预约制 + 24h 提前 + 人工派单 + 人工收款审核 + 人工司机审核。不接自动调度/支付网关。

## 试运营主链路

1. 客户预约下单（乘客端）
2. 后台报价/确认（管理 Web 订单详情）
3. 客户在支付页选择收款方式 → 按指引转账 → 上传截图 → `POST /api/order/:id/deposit/submit`
4. **支付审核中心** 确认定金
5. 人工派司机
6. 司机确认 → 行程 → 完成
7. 后台发起尾款 → 客户提交尾款凭证 → 审核确认
8. **财务对账** 标记司机已结算
9. **运营结案** `POST /api/admin/orders/:id/close`

## 管理 Web 菜单

| 路径 | 功能 |
|------|------|
| `/admin/payment-reviews` | 支付审核中心 |
| `/admin/driver-onboarding` | 司机入驻审核 |
| `/admin/finance` | 财务对账（含订单维度） |
| `/admin/orders/:id` | 订单详情：SOP、异常处理、凭证链接 |

## 关键 API（均需 admin JWT）

- `GET /api/admin/payment-reviews`
- `GET /api/admin/finance/reconciliation`
- `POST /api/admin/orders/:id/cancel`
- `POST /api/admin/orders/:id/change-price`
- `POST /api/admin/orders/:id/refund`
- `POST /api/admin/orders/:id/dispute`
- `PATCH /api/admin/orders/:id/sop`
- `POST /api/admin/orders/:id/sop/internal-note` 等
- `GET/PATCH /api/admin/drivers/onboarding`

## 部署

```bash
cd CNber_admin_web_v1.0 && npm run build
# 将 dist 复制到 CNber_backend/public/admin
cd CNber_backend && npm start
```

## 支付提交 body 示例

```json
{
  "proofImage": "http://host/uploads/payment-proofs/xxx.jpg",
  "note": "已通过 Wise 转账，备注 CNBER-订单号",
  "paymentAccountId": "收款账户 ObjectId",
  "paymentMethod": "wise",
  "payerName": "张三",
  "paidAmount": 50
}
```

上传截图：`POST /api/order/:id/payment-proof/upload`（body: `{ "imageBase64": "data:image/jpeg;base64,..." }`）
