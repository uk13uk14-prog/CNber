<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/* 司机端统一底色：沿用欢迎页深蓝基调，页面内容仍用白色卡片承载 */
	page {
		background-color: #16324f;
		/* H5 Preview safe-area；不影响 APP-PLUS 业务逻辑 */
		padding-top: env(safe-area-inset-top);
		padding-bottom: env(safe-area-inset-bottom);
	}

	.title {
		color: #ffffff;
	}
</style>
