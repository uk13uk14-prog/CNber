<template>
  <view class="rating-page">
    <view class="title">乘客评价</view>

    <view v-if="ratings.length > 0">
      <view v-for="(item, index) in ratings" :key="index" class="rating-card">
        <view class="header">
          <view class="name">{{ item.user }}</view>
          <view class="stars">
            <text v-for="i in 5" :key="i" class="star" :class="{ active: i <= item.stars }">★</text>
          </view>
        </view>
        <view class="comment">{{ item.comment }}</view>
        <view class="tags">
          <text v-for="(tag, i) in item.tags" :key="i" class="tag">{{ tag }}</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">暂无乘客评价</view>
  </view>
</template>

<script>
export default {
  name: 'D0302_driver_rating',
  data() {
    return {
      ratings: [
        {
          user: '李同学',
          stars: 5,
          comment: '司机很守时，服务也很专业，车很干净！',
          tags: ['守时', '服务好', '车干净']
        },
        {
          user: '王先生',
          stars: 4,
          comment: '整体不错，就是路上有些小堵车。',
          tags: ['态度好', '熟悉路线']
        }
      ]
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.rating-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 30rpx;
  }

  .rating-card {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 30rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10rpx;

      .name {
        font-size: 30rpx;
        color: $color-text-main;
      }

      .stars {
        font-size: 26rpx;
        color: $color-divider;

        .star.active {
          color: #FFD700;
        }
      }
    }

    .comment {
      font-size: 28rpx;
      color: $color-text-light;
      margin-bottom: 16rpx;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 16rpx;

      .tag {
        font-size: 24rpx;
        background-color: $color-primary-light;
        color: white;
        padding: 6rpx 16rpx;
        border-radius: 20rpx;
      }
    }
  }

  .empty {
    text-align: center;
    color: $color-text-light;
    font-size: 30rpx;
    margin-top: 80rpx;
  }
}
</style>
