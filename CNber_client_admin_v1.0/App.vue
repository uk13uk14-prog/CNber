<script>
	import { checkAppVersion } from './utils/appVersionCheck.js'
	import { startClientCancelWatch, stopClientCancelWatch } from './utils/clientCancelWatch.js'

	export default {
		onLaunch: function() {
			checkAppVersion('client')
			startClientCancelWatch()
		},
		onShow: function() {
			startClientCancelWatch()
		},
		onHide: function() {
			stopClientCancelWatch()
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
