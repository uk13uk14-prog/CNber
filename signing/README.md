# CNber Android 内部测试签名

本目录保存 **CNber 自有** 内部测试 keystore，用于 Driver / Client APK 固定签名，以便后续 beta 覆盖安装且登录数据不丢。

- 文件：`cnber-release.keystore`
- alias：`cnber`
- 有效期：10000 天
- **禁止用于应用商店上架。**
- **不要丢失、不要轮换，除非明确做一次全量重装。**

打包配置（含密码）在本目录 `pack-driver.json` / `pack-client.json`，不要提交到 git。
