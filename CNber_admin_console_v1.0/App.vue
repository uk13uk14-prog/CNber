<script>
export default {
  onLaunch() {},
  onShow() {},
  onHide() {}
}
</script>

<style lang="scss">
@import './styles/theme.scss';

page {
  background-color: $admin-bg;
  color: $admin-text;
  font-size: 28rpx;
}

/* H5 宽屏：居中收窄，便于平板/桌面预览 */
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
