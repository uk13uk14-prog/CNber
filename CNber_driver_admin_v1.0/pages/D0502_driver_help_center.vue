<template>
  <view class="help-page">
    <view class="title">帮助中心</view>

    <view class="faq-list">
      <view class="faq-item" v-for="(item, index) in faqs" :key="index">
        <view class="question" @click="toggle(index)">
          <text>{{ item.q }}</text>
          <text class="arrow">{{ item.expanded ? '▲' : '▼' }}</text>
        </view>
        <view v-if="item.expanded" class="answer">{{ item.a }}</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0502_driver_help_center',
  data() {
    return {
      faqs: [
        {
          q: '如何接单？',
          a: '请进入“接单中心”，查看可接订单列表，点击“确认接单”后即可进入行程模式。',
          expanded: false
        },
        {
          q: '如何查看收入？',
          a: '在首页点击“收入中心”查看今日、本周、本月收入明细，可点击“提现”进行操作。',
          expanded: false
        },
        {
          q: '行程中遇到问题怎么办？',
          a: '可点击“紧急求助”联系紧急联系人或拨打报警电话；也可联系平台客服。',
          expanded: false
        },
        {
          q: '订单完成后，是否可以查看历史记录？',
          a: '是的，您可以在“我的行程”中查看所有已完成订单的记录。',
          expanded: false
        }
      ]
    };
  },
  methods: {
    toggle(index) {
      this.faqs[index].expanded = !this.faqs[index].expanded;
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.help-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 30rpx;
  }

  .faq-list {
    background-color: white;
    border-radius: 16rpx;
    padding: 20rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

    .faq-item {
      border-bottom: 1rpx solid $color-divider;
      padding: 20rpx 0;

      .question {
        font-size: 30rpx;
        color: $color-text-main;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .answer {
        font-size: 28rpx;
        color: $color-text-light;
        margin-top: 16rpx;
        line-height: 1.6;
      }

      &:last-child {
        border-bottom: none;
      }

      .arrow {
        font-size: 26rpx;
        color: $color-primary;
      }
    }
  }
}
</style>
