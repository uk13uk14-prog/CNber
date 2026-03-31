<template>
  <view class="container">
    <!-- 星级评分 -->
    <view class="rating">
      <text>综合评分：</text>
      <view class="stars">
        <text
          v-for="n in 5"
          :key="n"
          @tap="rating = n"
          class="star"
          :class="{ active: n <= rating }"
        >★</text>
      </view>
    </view>

    <!-- 标签选择 -->
    <view class="tag-section">
      <text class="tag-title">评价亮点：</text>
      <view class="tags">
        <text
          v-for="tag in tagOptions"
          :key="tag"
          class="tag"
          :class="{ selected: selectedTags.includes(tag) }"
          @tap="toggleTag(tag)"
        >{{ tag }}</text>
      </view>
    </view>

    <!-- 建议填写 -->
    <view class="textarea-section">
      <text class="label">建议反馈（选填）</text>
      <textarea v-model="suggestion" placeholder="欢迎告诉我们您的建议..." />
    </view>

    <!-- 打赏功能 -->
    <view class="tip-section">
      <text class="tip-title">打赏司机（选填）</text>
      <view class="tip-options">
        <view 
          v-for="option in tipOptions"
          :key="option.amount"
          class="tip-option"
          :class="{ active: selectedTip === option.amount }"
          @tap="selectTip(option.amount)"
        >
          <text class="tip-emoji">{{ option.emoji }}</text>
          <text class="tip-amount">£{{ option.amount }}</text>
        </view>
      </view>
    </view>

    <!-- 提交按钮 -->
    <button class="submit-btn" @tap="submitRating">
      {{ selectedTip ? `⭐ 提交评价并打赏£${selectedTip}` : '⭐ 提交评价' }}
    </button>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const rating = ref(0) // 评分（必选）
const tagOptions = ['准时', '车干净', '服务好', '态度好', '价格合理']
const selectedTags = ref([]) // 评价标签（可选）
const suggestion = ref('') // 建议（可选）
const selectedTip = ref(null) // 打赏金额（可选）
const currentOrderId = ref('') // 当前订单ID

// 打赏选项
const tipOptions = [
  { amount: 2, emoji: '🥤' },
  { amount: 5, emoji: '🍱' },
  { amount: 10, emoji: '💷' }
]

// 获取订单ID
onMounted(() => {
  const pages = getCurrentPages()
  if (pages.length > 0) {
    currentOrderId.value = pages[pages.length - 1].options.orderId || ''
  }
})

// 切换标签选择
function toggleTag(tag) {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

// 选择打赏金额
function selectTip(amount) {
  selectedTip.value = selectedTip.value === amount ? null : amount
}

// 提交评价（一定会成功）
async function submitRating() {
  if (rating.value === 0) {
    uni.showToast({ title: '请先评分', icon: 'none' })
    return
  }

  uni.showLoading({ title: '提交中...' })
  
  // 模拟评价提交（实际使用时应替换为真实API）
  console.log('评价提交成功：', {
    orderId: currentOrderId.value,
    rating: rating.value,
    tags: selectedTags.value,
    suggestion: suggestion.value
  })
  
  // 延迟让加载动画显示一会儿
  await new Promise(resolve => setTimeout(resolve, 800))
  
  uni.hideLoading()
  
  if (selectedTip.value) {
    // 有打赏 -> 跳转支付页面
    uni.navigateTo({
      url: `/pages/A0106a_client_payment_v01?amount=${selectedTip.value}&orderId=${currentOrderId.value}&paymentType=tip`
    })
  } else {
    // 无打赏 -> 直接返回主页
    uni.showToast({ title: '评价成功', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/A0300_client_main_v01' })
    }, 1500)
  }
}
</script>
<style scoped>
.container {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 40rpx 30rpx;
}

/* 星级评分 */
.rating {
  margin-bottom: 40rpx;
  font-size: 66rpx;
  text-align: center;
  font-weight: bold;
}
.stars {
  margin-top: 20rpx;
}
.star {
  font-size: 68rpx;
  color: #ccc;
  margin: 0 5rpx;
}
.star.active {
  color: #ffcc00;
}

/* 标签选择 */
.tag-section {
  margin-bottom: 40rpx;
}
.tag-title {
  display: block;
  font-size: 38rpx;
  margin-bottom: 30rpx;
  font-weight: bold;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 17rpx; /* ✅ 控制标签间距的地方 */
}

.tag {
  width: 120rpx;
  text-align: center;
  background: #eee;
  border-radius: 20rpx;
  font-size: 25rpx;
  color: #333;
  padding: 10rpx;
  box-sizing: border-box;
  transition: background 0.2s;
}

.tag.selected {
  background: #007aff;
  color: white;
}

/* 建议 */
.textarea-section {
  margin-bottom: 20rpx;
  width: 95%;
}
.label {
  display: block;
  font-size: 32rpx;
  margin-bottom: 10rpx;
  font-weight: bold;
}
textarea {
  width: 98%;
  min-height: 100rpx;
  border-radius: 12rpx;
  background: #f9f9f9;
  padding: 20rpx;
  font-size: 28rpx;
  border: 1rpx solid #ccc;
  resize: none;
}

/* 打赏样式 */
.tip-section {
  margin-bottom: 40rpx;
}
.tip-title {
  display: block;
  font-size: 38rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
}
.tip-options {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
}
.tip-option {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2rpx solid #eee;
  transition: all 0.3s;
}
.tip-option.active {
  border-color: #ff9500;
  background: #fff8e6;
  transform: scale(1.05);
}
.tip-emoji {
  font-size: 48rpx;
  margin-bottom: 10rpx;
}
.tip-amount {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff9500;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  margin: 20rpx auto;
  padding: 18rpx 0;
  background: linear-gradient(to right, #00c6ff, #0072ff);
  text-align: center;
  border-radius: 20rpx;
  color: white;
  font-size: 28rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
