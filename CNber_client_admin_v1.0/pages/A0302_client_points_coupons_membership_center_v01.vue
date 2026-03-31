
<template>
  <view class="points-container">
    <!-- 顶部 Tab 栏 -->
    <view class="tabs">
      <view 
        v-for="(tab, index) in tabs"
        :key="index"
        :class="['tab-item', activeTab === index ? 'active' : '']"
        @click="activeTab = index"
      >
        {{ tab }}
      </view>
    </view>

    <!-- 内容区 -->
    <view class="content">
      <view class="content-box">
        <!-- 积分中心 -->
        <view v-if="activeTab === 0">
          <view class="section">
            <text class="section-title">我的积分</text>
            <view class="points-card">
              <text class="points">{{ points }} 分</text>
              <text class="desc">您当前的可用积分</text>
            </view>
          </view>

          <view class="section">
            <text class="section-title">积分使用记录</text>
            <view class="record-card" v-for="(record, index) in pointsRecords" :key="index">
              <text>{{ record.date }} - {{ record.action }} - {{ record.amount }}分</text>
            </view>
          </view>
        </view>

        <!-- 优惠券中心 -->
        <view v-if="activeTab === 1">
          <view v-for="(coupon, index) in coupons" :key="index" class="coupon-card">
            <view class="coupon-left">{{ coupon.amount }}元</view>
            <view class="coupon-right">
              <text class="coupon-desc">{{ coupon.desc }}</text>
              <text class="coupon-expire">有效期至 {{ coupon.expireDate }}</text>
            </view>
          </view>
        </view>

        <!-- 会员政策 -->
        <view v-if="activeTab === 2">
          <view class="section">
            <text class="section-title">会员政策</text>
            <view class="policy-card">
              <text>1. 成为会员可享受专属优惠和优先派单。</text>
              <text>2. 每年会员费用为365元。</text>
              <text>3. 会员有效期内，积分获取速度提升20%。</text>
              <text>4. 更多权益请联系客服咨询。</text>
            </view>
          </view>
        </view>

        <!-- 邀请码 -->
        <view v-if="activeTab === 3">
          <view class="section">
            <text class="section-title">我的邀请码</text>
            <view class="invite-card">
              <text class="invite-code">{{ inviteCode }}</text>
              <button class="copy-button" @click="copyCode">复制邀请码</button>
              <text class="invite-tip">分享给好友注册，即可获得积分奖励！</text>
            </view>
          </view>
        </view>
      </view>
    </view>
<!-- 积分说明区域 -->
<view class="points-note">
  <text class="note-title">积分说明：</text>
  <text class="note-line">1. 积分可用于兑换优惠券或参与活动；</text>
  <text class="note-line">2. 每消费1元积1分，特殊活动另行通知；</text>
  <text class="note-line">3. 兑换成功后不可退还，请谨慎操作。</text>
</view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      tabs: ['积分中心', '优惠券中心', '会员政策', '邀请码'],
      activeTab: 0,
      points: 250,
      pointsRecords: [
        { date: '2025-05-06', action: '乘车获得', amount: 20 },
        { date: '2025-05-03', action: '兑换优惠券', amount: -50 }
      ],
      coupons: [
        { amount: 10, desc: '满100减10元', expireDate: '2025-06-30' },
        { amount: 20, desc: '满200减20元', expireDate: '2025-07-15' }
      ],
      inviteCode: 'XYSZ2025'
    };
  },
  methods: {
    copyCode() {
      uni.setClipboardData({
        data: this.inviteCode,
        success: () => {
          uni.showToast({
            title: '邀请码已复制',
            icon: 'success'
          });
        }
      });
    },
    goHome() {
      uni.reLaunch({
        url: '/pages/A0300_client_main_v01'
      });
    }
  }
};
</script>

<style scoped>
.points-container {
  min-height: 100vh;
  padding: 20rpx;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
}
.points-note {
  background-color: #ffffff;
  border-radius: 20rpx;
  margin: 40rpx 0;
  padding: 30rpx;
  font-size: 20rpx;
  color: #444;
  line-height: 1.8;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}
.note-title {
  font-weight: bold;
  font-size: 25rpx;
  margin-bottom: 20rpx;
  display: block;
}
.note-line {
  display: block;
  margin-bottom: 10rpx;
}

.tabs {
  display: flex;
  background: #e6f3ff;
  border: 1rpx solid #cce6ff;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #333;
  border-right: 1rpx solid #cce6ff;
  transition: all 0.3s;
}
.tab-item:last-child {
  border-right: none;
}
.tab-item.active {
  font-weight: bold;
  color: #ff6600;
  background: #ffffff;
  border-bottom: 4rpx solid #ff6600;
}
.content {
  padding: 10rpx;
}
.content-box {
  background: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  padding: 30rpx;
}
.section {
  margin-bottom: 30rpx;
}
.section-title {
  font-size: 34rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  color: #333;
}
.points-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 40rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  margin-bottom: 20rpx;
}
.points {
  font-size: 60rpx;
  font-weight: bold;
  color: #ff6600;
}
.desc {
  font-size: 28rpx;
  margin-top: 10rpx;
  color: #666;
}
.record-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  font-size: 28rpx;
  color: #333;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}
.coupon-card {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  margin-bottom: 20rpx;
  overflow: hidden;
}
.coupon-left {
  background: #ff6600;
  color: #fff;
  width: 180rpx;
  text-align: center;
  padding: 20rpx 0;
  font-size: 36rpx;
  font-weight: bold;
}
.coupon-right {
  flex: 1;
  padding: 20rpx;
}
.coupon-desc {
  font-size: 28rpx;
  color: #333;
}
.coupon-expire {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}
.policy-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  font-size: 28rpx;
  color: #333;
  line-height: 1.8;
}
.invite-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 40rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}
.invite-code {
  font-size: 40rpx;
  font-weight: bold;
  color: #007aff;
  margin-bottom: 20rpx;
}
.copy-button {
  margin-top: 20rpx;
  background-color: #007aff;
  color: white;
  width: 60%;
  border-radius: 50rpx;
  height: 80rpx;
  font-size: 28rpx;
}
.invite-tip {
  font-size: 26rpx;
  color: #999;
  margin-top: 20rpx;
}
.return-home-btn {
  width: 90%;
  margin: 40rpx auto 20rpx auto;
  padding: 26rpx 0;
  background: linear-gradient(to right, #00c6ff, #0072ff);
  text-align: center;
  border-radius: 50rpx;
  color: white;
  font-size: 28rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
.footer {
  text-align: center;
  font-size: 12rpx;
  color: #777;
  margin-bottom: 20rpx;
}
</style>
