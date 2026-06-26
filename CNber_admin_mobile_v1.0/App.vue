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

<style lang="scss">
@import './styles/theme.scss';
@import './styles/common.scss';

page {
  background-color: $admin-bg;
  color: $admin-text;
  font-size: 28rpx;
}

/* #ifdef H5 */
@media (min-width: 768px) {
  uni-page-body,
  page {
    max-width: 750px;
    margin-left: auto;
    margin-right: auto;
  }
}
/* #endif */
</style>
