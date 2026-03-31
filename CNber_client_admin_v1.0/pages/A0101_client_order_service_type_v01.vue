<template> 
  <view class="container">
    <view class="title">请您选择</view>
    <view class="service-grid">
      <view class="service-item pickup" @click="selectService('pickup')">
        <text class="label">🛬接机</text>
      </view>
      <view class="service-item dropoff" @click="selectService('dropoff')">
        <text class="label">🛫送机</text>
      </view>
      <view class="service-item point" @click="selectService('point')">
        <text class="label">📍点对点</text>
      </view>
      <view class="service-item charter" @click="selectService('charter')">
        <text class="label">🚘包车</text>
      </view>
    </view>

    <!-- 底部提示语 -->
    <view class="tip-text"> 温馨提示：司机均通过实名认证，中步出行将为您保驾护航.请您乘车时全程系好安全带，祝您旅途平安愉快！
    </view>

    <!-- ✅ 新增：返回主页按钮 -->
    <view class="home-button" @tap="goHome">🏠 返回主页</view>

  </view>
</template>




<script setup>
function selectService(type) {
  let url = ''
  if (type === 'pickup') {
    url = '/pages/A0102_client_order_pickup_v01'
  } else if (type === 'dropoff') {
    url = '/pages/A0103_client_order_dropoff_v01'
  } else if (type === 'point') {
    url = '/pages/A0104_client_order_point_v01'
  } else if (type === 'charter') {
    url = '/pages/A0105_client_order_charter_v01'
  }
  if (url) {
    uni.navigateTo({ url })
  }
}

// ✅ 新增跳转首页逻辑
function goHome() {
  uni.redirectTo({
    url: '/pages/A0300_client_main_v01'
  })
}
</script>

<style>
.container {
  padding: 40rpx;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
}
.title {
  text-align: center;
  font-size: 66rpx;
  font-weight: bold;
  margin: 20rpx 0 30rpx;
}
.service-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30rpx;
  justify-content: center;
}
.service-item {
  border-radius: 20rpx;
  box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.1);
  padding: 80rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}
.service-item:active {
  transform: scale(0.96);
}
.label {
  font-size:62rpx;
  font-weight: bold;
  color: #333;
}

/* 马卡龙色调 */
.pickup {
  background: #ffe4e1;
}
.dropoff {
  background: #fff5ba;
}
.point {
  background: #c1f0f6;
}
.charter {
  background: #ffd1dc;
}

/* 新增的提示语样式 */
.tip-text {
  text-align: center;
  font-size:25px;
  color: #555;
  margin-top: 50rpx;
}

/* ✅ 新增：返回主页按钮样式 */
.home-button {
  margin-top: 60rpx;
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: white;
  text-align: center;
  padding: 24rpx;
  font-size: 28rpx;
  border-radius: 50rpx;
}
.footer {
  text-align: center;
  font-size: 12rpx;
  color: #777;
  margin-bottom: 20rpx;
}
</style>
