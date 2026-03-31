<template>
  <view class="vip-page">
    <view class="title">VIP 会员权益</view>

    <view class="vip-card" :class="vipStatus.active ? 'active' : 'inactive'">
      <view class="vip-status">
        <text class="status">{{ vipStatus.active ? '已激活' : '未激活' }}</text>
        <text v-if="vipStatus.active" class="expire">有效期至 {{ vipStatus.expireDate }}</text>
      </view>
    </view>

    <view class="benefits-box">
      <view class="subtitle">VIP 等级权益</view>

      <view class="benefit-item" v-for="item in benefits" :key="item.title">
        <text class="label">{{ item.title }}</text>
        <text class="desc">{{ item.desc }}</text>
      </view>
    </view>

    <view class="tip-box">
      🧡 司机结算周期满 2 周 / 4 周可自动激活 VIP，享受佣金减免与派单优先等权益。
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0705_driver_vip_membership',
  data() {
    return {
      vipStatus: {
        active: true,
        expireDate: '2026-05-21'
      },
      benefits: [
        { title: '佣金费率', desc: '普通司机 15%，VIP 最低至 5%' },
        { title: '派单优先级', desc: 'VIP 优先接大单、旅游单、回程单' },
        { title: '年度分红资格', desc: '4周周期司机享受平台收益分红' },
        { title: '提现提醒', desc: '收益超过 365 英镑自动提醒激活 VIP' }
      ]
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.vip-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    color: $color-primary;
    font-weight: bold;
    margin-bottom: 30rpx;
  }

  .vip-card {
    padding: 30rpx;
    border-radius: 16rpx;
    margin-bottom: 30rpx;
    text-align: center;
    background-color: #f5f5f5;

    &.active {
      background-color: $color-primary-light;
      color: white;
    }

    .vip-status {
      font-size: 32rpx;

      .status {
        font-weight: bold;
        margin-bottom: 10rpx;
        display: block;
      }

      .expire {
        font-size: 26rpx;
      }
    }
  }

  .benefits-box {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 30rpx;

    .subtitle {
      font-size: 30rpx;
      font-weight: bold;
      color: $color-text-main;
      margin-bottom: 20rpx;
    }

    .benefit-item {
      font-size: 28rpx;
      margin-bottom: 20rpx;

      .label {
        color: $color-primary;
        font-weight: bold;
        margin-right: 10rpx;
      }

      .desc {
        color: $color-text-light;
      }
    }
  }

  .tip-box {
    background-color: #fff8e1;
    padding: 24rpx;
    border-radius: 12rpx;
    font-size: 26rpx;
    color: #d48806;
    text-align: center;
  }
}
</style>
