<script>
	import { startDriverTaskWatch, pauseDriverTaskWatch, stopDriverTaskWatch } from './utils/driverTaskWatch.js'
	import { startDriverCancelDecisionWatch, stopDriverCancelDecisionWatch } from './utils/driverCancelDecisionWatch.js'
	import { checkAppVersion } from './utils/appVersionCheck.js'

	export default {
		onLaunch: function() {
			startDriverTaskWatch({ immediate: true })
			startDriverCancelDecisionWatch()
			checkAppVersion('driver')
		},
		onShow: function() {
			startDriverTaskWatch({ immediate: true })
			startDriverCancelDecisionWatch()
		},
		onHide: function() {
			pauseDriverTaskWatch()
		},
		onUnload: function() {
			stopDriverTaskWatch()
			stopDriverCancelDecisionWatch()
		}
	}
</script>

<style>
	/* 司机端统一底色：沿用欢迎页深蓝基调，页面内容仍用白色卡片承载 */
	page {
		background-color: #16324f;
	}

	.title {
		color: #ffffff;
	}
</style>
