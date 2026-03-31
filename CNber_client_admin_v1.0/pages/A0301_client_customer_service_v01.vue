<template>
  <view class="container">
    <view class="header"></view>

    <scroll-view class="chat-box" scroll-y="true">
      <view v-for="(msg, index) in messages" :key="index" :class="['message', msg.from]">
        <image class="avatar" :src="msg.from === 'user' ? '/static/avatar_user.png' : '/static/avatar_ai.png'" />
        <view class="bubble">{{ msg.text }}</view>
      </view>
    </scroll-view>

    <view class="input-box">
      <input v-model="input" placeholder="请输入您的问题..." class="input" />
      <button class="send-btn" @tap="sendMessage">发送</button>
    </view>

    <view class="bottom-note">感谢您对中步出行平台的支持，祝您英国生活愉快！</view>

  </view>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const input = ref('')
const messages = ref([
  { from: 'ai', text: '您好！我是客服“小赛”，请问有什么可以帮您？' },

])

// 发送消息逻辑
const sendMessage = () => {
  if (!input.value.trim()) return;

  messages.value.push({
    from: 'user',
    text: input.value
  })

  input.value = ''

  // 模拟客服自动回复
  setTimeout(() => {
    messages.value.push({
      from: 'bot',
      text: '好的，我们将尽快为您处理~'
    })
  }, 800)
}


const goHome = () => {
  uni.redirectTo({ url: '/pages/A0300_client_main_v01' })
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
}
.header {
  font-size: 46rpx;
  font-weight: bold;
  padding: 20rpx;
  text-align: center;
}
.chat-box {

  padding: 20rpx;
  max-height: 600rpx;  /* 👈 也可以使用固定高度 */
  overflow-y: auto;
}


.message {
  display: flex;
  align-items: flex-start;
  margin-bottom: 30rpx;
}

/* 客服消息：头像在左，文字在右 */
.message.bot {
  flex-direction: row;
}

.message.bot .avatar {
  margin-right: 16rpx;
}

/* 用户消息：头像在右，文字在左 */
.message.user {
  flex-direction: row-reverse;
    margin-right: 40rpx;
   
}

.message.user .avatar {
  margin-left: 16rpx;
}

/* 通用头像样式 */
.avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
}

/* 通用气泡样式 */
.bubble {
  max-width: 70%;
  background: white;
  padding: 20rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  line-height: 1.6;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);
}

.input-box {
  display: flex;
  padding: 20rpx;
  background: white;
}
.input {
  flex: 1;
  border-radius: 10rpx;
  padding: 26rpx;
  font-size: 28rpx;
  background: #f0f0f0;
}
.send-btn {
  margin-left: 30rpx;
  background-color: #007aff;
  color: white;
  padding: 10rpx 30rpx;
  border-radius: 22rpx;
  font-size: 30rpx;
}
.bottom-note {
  text-align: center;
  font-size: 16rpx;
  color: #666;
  margin: 10rpx 0;
}
.return-btn {
	  width: 90%;
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: white;
  padding: 24rpx;
  border-radius: 50rpx;
  font-size: 32rpx;
  margin: 35rpx;
}
.footer {
  text-align: center;
  font-size: 12rpx;
  color: #777;
  margin-bottom: 20rpx;
}
</style>