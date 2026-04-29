/**
 * 工作台快捷入口（配置层，后续可接权限过滤）
 * preset：在跳转订单 Tab 前写入 Storage，由订单列表 onShow 读取
 */
export const DASHBOARD_SHORTCUTS = [
  { key: 'orders', label: '订单管理', path: '/pages/B0101_admin_order_list', type: 'switchTab' },
  {
    key: 'dispatch',
    label: '分发中心',
    path: '/pages/B0101_admin_order_list',
    preset: 'dispatch',
    type: 'switchTab'
  },
  { key: 'drivers', label: '司机管理', path: '/pages/B0201_admin_driver_list', type: 'switchTab' },
  { key: 'customers', label: '客户管理', path: '/pages/B0202_admin_customer_list', type: 'switchTab' },
  {
    key: 'follow',
    label: '跟进记录',
    path: '/pages/B0101_admin_order_list',
    preset: 'follow',
    type: 'switchTab'
  }
]
