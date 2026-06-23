/** CRM 推荐名单预设（规则引擎 V1） */
const CRM_PRESETS = {
  high_value: {
    key: 'high_value',
    name: '高价值客户',
    description: '订单 ≥5 且消费 ≥¥5000',
    filters: {
      preset: 'high_value',
      totalOrdersMin: 5,
      totalSpentCnyMin: 5000
    }
  },
  airport: {
    key: 'airport',
    name: '机场客户',
    description: 'AI 标签包含「机场用户」',
    filters: {
      preset: 'airport',
      aiTagsInclude: ['机场用户']
    }
  },
  dormant: {
    key: 'dormant',
    name: '沉睡客户',
    description: '90 天未下单',
    filters: {
      preset: 'dormant',
      lastOrderAtBeforeDays: 90
    }
  },
  new_customer: {
    key: 'new_customer',
    name: '新客户',
    description: '订单数 = 1',
    filters: {
      preset: 'new_customer',
      totalOrdersMin: 1,
      totalOrdersMax: 1
    }
  },
  complaint: {
    key: 'complaint',
    name: '投诉客户',
    description: '存在投诉工单',
    filters: {
      preset: 'complaint',
      hasComplaint: true
    }
  }
}

function listCrmPresets() {
  return Object.values(CRM_PRESETS).map((p) => ({
    key: p.key,
    name: p.name,
    description: p.description,
    filters: { ...p.filters }
  }))
}

function getCrmPreset(key) {
  return CRM_PRESETS[key] || null
}

module.exports = { CRM_PRESETS, listCrmPresets, getCrmPreset }
