<template>
  <view class="main-container">
    <view class="header">
    </view>
    
    <!-- 广告位条 -->
    <view class="card ad-banner ad-slot">广告位｜admin@cnber.vip</view>

    <!-- 主功能区卡片 -->
    <view class="grid">
      <view class="card grid-item red" @tap="goOrderCenter">🛒 下单中心</view>
      <view class="card grid-item peach" @tap="goOrder">🧾 我的订单</view>
      <view class="card grid-item mint" @tap="goTrip">🙋‍♀️ 我的行程</view>
      <view class="card grid-item lilac" @tap="goSOS">🚨 SOS帮助</view>
      <view class="card grid-item blush" @tap="goService">💳 支付中心</view>
      <view class="card grid-item gemstone" @tap="goRating">⭐ 订单评价</view>
      <view class="card grid-item cream" @tap="goPoints">🎁 会员中心</view>
      <view class="card grid-item soft-purple" @tap="goActivity">🍦 公益中心</view>
      <view class="card grid-item baby-blue" @tap="goProfile">👤 账户信息</view>
      <view class="card grid-item mango" @tap="goNotifications">🔔 消息通知</view>
      <view class="card grid-item sand" @tap="goHelp">❓ 帮助中心</view>
      <view class="card grid-item ash" @tap="goLogout">🚪 退出登录</view>
    </view>

    <!-- 商务联系条 -->
    <view class="card ad-banner biz-contact">商务合作｜admin@cnber.vip</view>
  </view>
</template>

<script>
export default {
  methods: {
    goOrderCenter() { uni.navigateTo({ url: '/pages/A0101_client_order_service_type_v01' }) },
    goOrder() { uni.navigateTo({ url: '/pages/A0202_client_order_history_v01' }) },
    goTrip() { uni.navigateTo({ url: '/pages/A0110_client_in_trip_v01' }) },
    goService() { uni.navigateTo({ url: '/pages/A0312_client_payment_center_v01' }) },
    goPoints() { uni.navigateTo({ url: '/pages/A0302_client_points_coupons_membership_center_v01' }) },
    goActivity() { uni.navigateTo({ url: '/pages/A0304_client_events_center_v01' }) },
    goSOS() { uni.navigateTo({ url: '/pages/A0305_client_sos_v01' }) },
    goRating() { uni.navigateTo({ url: '/pages/A0201_client_rating_v01' }) },
    goProfile() { uni.navigateTo({ url: '/pages/A0005_client_profile_detail_v01' }) },
    goNotifications() { uni.navigateTo({ url: '/pages/A0502_client_notifications_v01' }) },
    goHelp() { uni.navigateTo({ url: '/pages/A0403_client_help_center_v01' }) },
    goLogout() { uni.navigateTo({ url: '/pages/A0009_client_logout_confirm_v01' }) }
  }
}
</script>

<style scoped>
.main-container {
  min-height: 100vh;
  background: linear-gradient(to bottom right, #fcfcff, #e1f9ff);
  padding: 20rpx;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0rpx; /* 从20rpx减少到10rpx */
  margin-top: 0rpx; /* 添加顶部外边距 */
}

.title {
  font-size: 46rpx;
  font-weight: bold;
  padding-left: 20rpx;
  color: #333;
}

.logo {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

/* 优化后的卡片样式 */
.card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 0rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.card:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.ad-banner {
  text-align: center;
  font-size: 36rpx;
  font-weight: 500;
  color: #663c00;
  margin: 20rpx 0; /* 上下间距 */
}

.ad-slot {
  background: linear-gradient(to right, #fff6d3, #ffe9b9);
}

.biz-contact {
  background: linear-gradient(to right, #d3f9ff, #c6efff);
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  justify-content: space-between;
  margin: 30rpx 0;
}

.grid-item {
  width: calc(50% - 12rpx);
  height: 180rpx;
  border-radius: 24rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  padding: 10rpx;
  box-sizing: border-box;
}

/* 优化后的颜色方案 */
.red { background: linear-gradient(135deg, #ff9a9e, #fad0c4); }
.peach { background: linear-gradient(135deg, #ffecd2, #fcb69f); }
.mint { background: linear-gradient(135deg, #a1c4fd, #c2e9fb); }
.lilac { background: linear-gradient(135deg, #d4b6fc, #e8c9fa); }
.blush { background: linear-gradient(135deg, #ffc3a0, #ffafbd); }
.gemstone { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.cream { background: linear-gradient(135deg, #ffdde1, #ee9ca7); }
.soft-purple { background: linear-gradient(135deg, #c9d6ff, #e2e2e2); }
.baby-blue { background: linear-gradient(135deg, #89f7fe, #66a6ff); }
.mango { background: linear-gradient(135deg, #f6d365, #fda085); }
.sand { background: linear-gradient(135deg, #e6b980, #eacda3); }
.ash { background: linear-gradient(135deg, #f5f7fa, #c3cfe2); }

.footer {
  margin-top: 40rpx;
  text-align: center;
  font-size: 24rpx;
  color: #777;
  padding: 30rpx 0;
}
</style>