<template>
  <view class="donation-container">
    <!-- 我的捐赠总览 -->
    <view class="section">
      <text class="section-title">我的捐赠总览</text>
      <view class="my-donation-card">
        <view class="row">
          <text>本月累计捐赠：</text>
          <text class="highlight">{{ myDonation.month }} 元</text>
        </view>
        <view class="row">
          <text>累计捐赠：</text>
          <text class="highlight">{{ myDonation.total }} 元</text>
        </view>
        <view class="row">
          <text>最近一次捐赠时间：</text>
          <text class="highlight">{{ myDonation.lastTime }}</text>
        </view>
      </view>
    </view>

    <!-- 平台公益基金概况 -->
    <view class="section">
      <text class="section-title">平台公益基金</text>
      <view class="fund-card">
        <view class="row">
          <text>平台累计金额：</text>
          <text class="highlight">{{ platformFund.total }} 元</text>
        </view>
        <view class="row">
          <text>已发起公益次数：</text>
          <text class="highlight">{{ platformFund.events }} 次</text>
        </view>
        <view class="row">
          <text>资金透明度：</text>
          <text class="highlight link" @click="viewTransparency">查看详情</text>
        </view>
      </view>
    </view>

    <!-- 公益活动专区 -->
    <view class="section">
      <text class="section-title">公益活动专区</text>
      <view class="activity-card" v-for="(activity, index) in activities" :key="index">
        <image :src="activity.image" class="activity-image"></image>
        <view class="activity-info">
          <text class="activity-title">{{ activity.title }}</text>
          <text class="activity-status">{{ activity.status }}</text>
          <text class="activity-desc">{{ activity.description }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      myDonation: {
        month: 12,
        total: 58,
        lastTime: '2025-05-06'
      },
      platformFund: {
        total: 10234,
        events: 3
      },
      activities: [
        {
          title: '爱心植树活动',
          status: '进行中',
          description: '我们已累计一万客户的公益基金，将在本月底启动公益植树行动。',
          image: 'https://dummyimage.com/600x300/8fd3f4/ffffff&text=植树活动'
        },
        {
          title: '助力老人院',
          status: '已完成',
          description: '2025年3月，我们将筹得的5000元捐赠至本地老人院，感谢您的支持！',
          image: 'https://dummyimage.com/600x300/ffd699/333333&text=老人院公益'
        }
      ]
    };
  },
  methods: {
    viewTransparency() {
      uni.showModal({
        title: '资金透明度',
        content: '这里展示平台的公益资金流向及明细。未来可跳转详情页。',
        showCancel: false
      });
    }
  }
};
</script>

<style scoped>
.donation-container {
  padding: 30rpx;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
}

.section {
  margin-bottom: 50rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  color: #333;
}

.my-donation-card,
.fund-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
  font-size: 28rpx;
}

.highlight {
  font-weight: bold;
  color: #ff6600;
}

.link {
  color: #007aff;
  text-decoration: underline;
}

.activity-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  margin-bottom: 30rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.activity-image {
  width: 100%;
  height: 200rpx;
  object-fit: cover;
}

.activity-info {
  padding: 20rpx;
}

.activity-title {
  font-size: 30rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
  color: #333;
}

.activity-status {
  font-size: 26rpx;
  color: #ff6600;
  margin-bottom: 10rpx;
}

.activity-desc {
  font-size: 26rpx;
  color: #666;
}
</style>
