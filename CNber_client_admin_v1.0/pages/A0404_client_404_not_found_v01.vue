<template>
  <view class="page-container">
    <view class="header">
      <text class="title">隐私政策</text>
    </view>
    <scroll-view class="content-box" scroll-y>
      <text class="content-text">
        这里是隐私政策的详细内容...（可替换为实际文本）这里是隐私政策的详细内容...这里是隐私政策的详细内容...这里是隐私政策的详细内容...这里是隐私政策的详细内容...这里是隐私政策的详细内容...
      </text>
    </scroll-view>
  </view>
</template>

<script setup>
// 可添加逻辑，如加载政策内容
</script>

<style scoped>
.page-container {
  width: 100vw;
  max-width: 100%;
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(to bottom, #a0cfff, #cce6ff);
  box-sizing: border-box;
}
.header {
  text-align: center;
  margin-bottom: 20px;
}
.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  padding: 10px 0;
}
.content-box {
  flex: 1;
  background: #fff;
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  width: 100%;
  box-sizing: border-box;
}
.content-text {
  font-size: 15px;
  line-height: 1.8;
  color: #555;
}
.footer {
  text-align: center;
  margin-top: 20px;
  font-size: 12px;
  color: #777;
}
</style>