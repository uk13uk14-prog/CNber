<script>
export default {
  onLaunch() {
    const token = uni.getStorageSync('cnber_admin_mobile_token')
    if (!token) {
      uni.reLaunch({ url: '/pages/M0001_admin_login' })
    }
  }
}
</script>

<style>
page {
  background: #f5f6f8;
  color: #1a1d21;
  font-size: 28rpx;
}
</style>
