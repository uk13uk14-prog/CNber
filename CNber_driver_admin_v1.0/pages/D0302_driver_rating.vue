<template>
  <view class="rating-page">
    <view class="title">乘客评价</view>

    <view v-if="loadError" class="error-box">
      <text>{{ loadError }}</text>
      <button class="retry-btn" size="mini" @click="loadRatings">重试</button>
    </view>

    <view v-else-if="loading" class="empty">加载中…</view>

    <view v-else-if="ratings.length > 0">
      <view v-for="item in ratings" :key="item._id" class="rating-card">
        <view class="header">
          <view class="meta">
            <text class="order-no">订单 {{ item.orderNo || '—' }}</text>
            <text class="time">{{ formatTime(item.createdAt) }}</text>
          </view>
          <view class="stars">
            <text v-for="i in 5" :key="i" class="star" :class="{ active: i <= item.driverStars }">★</text>
          </view>
        </view>
        <view class="score-row">
          <text>司机 {{ item.driverStars }} 星</text>
          <text>服务 {{ item.serviceStars }} 星</text>
        </view>
        <view v-if="item.comment" class="comment">{{ item.comment }}</view>
        <view v-if="item.tags?.length" class="tags">
          <text v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">暂无乘客评价</view>
  </view>
</template>

<script>
import { getDriverRatings } from '../utils/driverApi.js'

export default {
  name: 'D0302_driver_rating',
  data() {
    return {
      ratings: [],
      loading: false,
      loadError: ''
    }
  },
  onShow() {
    this.loadRatings()
  },
  methods: {
    formatTime(value) {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '—'
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    },
    async loadRatings() {
      this.loading = true
      this.loadError = ''
      try {
        const data = await getDriverRatings({ page: 1, pageSize: 50 })
        this.ratings = Array.isArray(data?.ratings) ? data.ratings : []
      } catch (e) {
        this.ratings = []
        this.loadError = e?.message || '加载评价失败，请稍后重试'
      } finally {
        this.loading = false
      }
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

  .error-box {
    background: #fff5f5;
    border-radius: 12rpx;
    padding: 24rpx;
    color: #b91c1c;
    font-size: 28rpx;
    margin-bottom: 24rpx;
  }

  .retry-btn {
    margin-top: 16rpx;
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
      align-items: flex-start;
      margin-bottom: 12rpx;
      gap: 16rpx;
    }

    .meta {
      flex: 1;
    }

    .order-no {
      display: block;
      font-size: 28rpx;
      color: $color-text-main;
      font-weight: 600;
    }

    .time {
      display: block;
      font-size: 24rpx;
      color: $color-text-light;
      margin-top: 6rpx;
    }

    .stars {
      font-size: 26rpx;
      color: $color-divider;

      .star.active {
        color: #ffd700;
      }
    }

    .score-row {
      display: flex;
      gap: 24rpx;
      font-size: 26rpx;
      color: #64748b;
      margin-bottom: 12rpx;
    }

    .comment {
      font-size: 28rpx;
      color: $color-text-light;
      margin-bottom: 16rpx;
      line-height: 1.5;
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
