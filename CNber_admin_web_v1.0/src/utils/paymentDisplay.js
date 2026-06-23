const METHOD_LABELS = {
  bank: '银行转账',
  wise: 'Wise',
  revolut: 'Revolut',
  wechat: '微信',
  alipay: '支付宝',
  other: '其他'
}

export function paymentMethodLabel(method) {
  const m = String(method || '').trim()
  return METHOD_LABELS[m] || m || '—'
}

/** 收款账户展示：优先 displayName，附 accountName */
export function paymentAccountLabel(account) {
  if (!account) return '—'
  const name = account.displayName || ''
  const owner = account.accountName || ''
  if (name && owner && name !== owner) return `${name}（${owner}）`
  return name || owner || '—'
}

export function formatReviewAccount(row) {
  if (!row) return '—'
  if (row.paymentAccount) return paymentAccountLabel(row.paymentAccount)
  if (row.paymentMethodLabel && row.paymentMethodLabel !== '—') {
    return row.paymentMethodLabel
  }
  return '—'
}
