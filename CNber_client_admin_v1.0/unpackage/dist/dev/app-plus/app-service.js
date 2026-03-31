if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$B = {
    __name: "A0001_client_welcome_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const logoSrc = `/static/logo.png?v=${Date.now()}`;
      const hasClicked = vue.ref(false);
      const goLogin = () => {
        hasClicked.value = true;
        uni.navigateTo({
          url: "/pages/A0002_client_login_v01"
        });
      };
      vue.onMounted(() => {
        setTimeout(() => {
          if (!hasClicked.value) {
            goLogin();
          }
        }, 5e3);
      });
      const __returned__ = { logoSrc, hasClicked, goLogin, ref: vue.ref, onMounted: vue.onMounted };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$A(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" ✅ 主体内容自动居中显示 "),
      vue.createElementVNode("view", { class: "main" }, [
        vue.createElementVNode("image", {
          class: "logo",
          src: $setup.logoSrc,
          mode: "widthFix"
        }),
        vue.createElementVNode("view", { class: "titles-container" }, [
          vue.createElementVNode("text", { class: "title title-top" }, "欢迎使用"),
          vue.createElementVNode("text", { class: "title title-bottom" }, "中步出行")
        ]),
        vue.createElementVNode("button", {
          class: "enter-btn",
          onClick: $setup.goLogin
        }, "立即进入")
      ]),
      vue.createCommentVNode(" ✅ 底部版权区域始终固定 "),
      vue.createElementVNode("view", { class: "footer" }, "@2025 中步出行 版权所有")
    ]);
  }
  const PagesA0001ClientWelcomeV01 = /* @__PURE__ */ _export_sfc(_sfc_main$B, [["render", _sfc_render$A], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0001_client_welcome_v01.vue"]]);
  const _imports_0$3 = "/static/icons/wechat.png";
  const _imports_1 = "/static/icons/alipay.png";
  const _imports_2 = "/static/icons/apple.png";
  const _sfc_main$A = {
    __name: "A0002_client_login_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const phone = vue.ref("");
      const captchaCode = vue.ref("");
      const password = vue.ref("");
      const captchaUrl = vue.ref("/static/icons/captcha1.png");
      const isChecked = vue.ref(false);
      const isLoading = vue.ref(false);
      const countryList = vue.ref([
        { code: "+86", zh: "中国" },
        { code: "+44", zh: "英国" },
        { code: "+852", zh: "香港" },
        { code: "+853", zh: "澳门" },
        { code: "+886", zh: "台湾" },
        { code: "+65", zh: "新加坡" },
        { code: "+60", zh: "马来西亚" },
        { code: "+66", zh: "泰国" }
      ]);
      const selectedCountry = vue.ref("");
      const selectCountry = (e) => {
        const item = countryList.value[e.detail.value];
        selectedCountry.value = `${item.code} ${item.zh}`;
      };
      const refreshCaptcha = () => {
        const index = Math.floor(Math.random() * 3) + 1;
        captchaUrl.value = `/static/icons/captcha${index}.png`;
      };
      const toggleCheck = () => {
        isChecked.value = !isChecked.value;
      };
      const login = () => {
        if (!isChecked.value) {
          uni.showToast({ title: "请先同意协议", icon: "none" });
          return;
        }
        if (!phone.value || !password.value || !captchaCode.value) {
          uni.showToast({ title: "请填写完整信息", icon: "none" });
          return;
        }
        isLoading.value = true;
        setTimeout(() => {
          isLoading.value = false;
          uni.redirectTo({ url: "/pages/A0300_client_main_v01" });
        }, 1e3);
      };
      const loginWithWechat = () => {
        uni.showToast({ title: "微信登录开发中", icon: "none" });
      };
      const loginWithAlipay = () => {
        uni.showToast({ title: "支付宝登录开发中", icon: "none" });
      };
      const loginWithApple = () => {
        uni.showToast({ title: "Apple 登录开发中", icon: "none" });
      };
      vue.onMounted(() => {
        selectedCountry.value = `${countryList.value[0].code} ${countryList.value[0].zh}`;
      });
      const __returned__ = { phone, captchaCode, password, captchaUrl, isChecked, isLoading, countryList, selectedCountry, selectCountry, refreshCaptcha, toggleCheck, login, loginWithWechat, loginWithAlipay, loginWithApple, ref: vue.ref, onMounted: vue.onMounted };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$z(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "page-title" }, "您好！"),
      vue.createElementVNode("view", { class: "card" }, [
        vue.createElementVNode("view", { class: "input-group" }, [
          vue.createElementVNode("picker", {
            onChange: $setup.selectCountry,
            range: $setup.countryList,
            "range-key": "zh"
          }, [
            vue.createElementVNode(
              "view",
              { class: "input-picker" },
              vue.toDisplayString($setup.selectedCountry),
              1
              /* TEXT */
            )
          ], 40, ["range"]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.phone = $event),
              placeholder: "请输入手机号"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.phone]
          ])
        ]),
        vue.createElementVNode("view", { class: "input-group" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.captchaCode = $event),
              placeholder: "输入图形验证码"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.captchaCode]
          ]),
          vue.createElementVNode("view", {
            class: "captcha-wrapper",
            onClick: $setup.refreshCaptcha
          }, [
            vue.createElementVNode("image", {
              src: $setup.captchaUrl,
              class: "captcha-img"
            }, null, 8, ["src"]),
            vue.createElementVNode("text", { class: "captcha-text" }, "换一张")
          ])
        ]),
        vue.createElementVNode("view", { class: "input-group" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.password = $event),
              placeholder: "请输入密码",
              password: ""
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.password]
          ])
        ]),
        vue.createCommentVNode(" 协议勾选 "),
        vue.createElementVNode("view", { class: "agreement" }, [
          vue.createElementVNode("checkbox", {
            checked: $setup.isChecked,
            onClick: $setup.toggleCheck
          }, null, 8, ["checked"]),
          vue.createElementVNode("text", { class: "agreement-text" }, "我已阅读并同意")
        ]),
        vue.createElementVNode("view", { class: "agreement" }, [
          vue.createElementVNode("navigator", {
            url: "/pages/A0306_client_privacy_policy_v01",
            class: "link"
          }, "《法律协议》"),
          vue.createElementVNode("text", { class: "divider" }, "|"),
          vue.createElementVNode("navigator", {
            url: "/pages/A0307_client_terms_of_service_v01",
            class: "link"
          }, "《服务协议》")
        ]),
        vue.createElementVNode("button", {
          class: "login-btn",
          loading: $setup.isLoading,
          disabled: !$setup.isChecked,
          onClick: $setup.login
        }, " 登录 ", 8, ["loading", "disabled"]),
        vue.createCommentVNode(" 底部链接 "),
        vue.createElementVNode("view", { class: "agreement" }, [
          vue.createElementVNode("navigator", {
            url: "/pages/A0003_client_register_v01",
            class: "link"
          }, "《注册账号》"),
          vue.createElementVNode("text", { class: "divider" }, "|"),
          vue.createElementVNode("navigator", {
            url: "/pages/A0303_client_change_password_v01",
            class: "link"
          }, "《忘记密码》")
        ])
      ]),
      vue.createElementVNode("view", { class: "third-login" }, [
        vue.createElementVNode("text", { class: "third-title" }, "快捷登录入口"),
        vue.createElementVNode("view", { class: "third-icons" }, [
          vue.createElementVNode("image", {
            src: _imports_0$3,
            class: "icon",
            onClick: $setup.loginWithWechat
          }),
          vue.createElementVNode("image", {
            src: _imports_1,
            class: "icon",
            onClick: $setup.loginWithAlipay
          }),
          vue.createElementVNode("image", {
            src: _imports_2,
            class: "icon",
            onClick: $setup.loginWithApple
          })
        ])
      ])
    ]);
  }
  const PagesA0002ClientLoginV01 = /* @__PURE__ */ _export_sfc(_sfc_main$A, [["render", _sfc_render$z], ["__scopeId", "data-v-00b814b3"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0002_client_login_v01.vue"]]);
  const _sfc_main$z = {
    __name: "A0003_client_register_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const phone = vue.ref("");
      const captchaInput = vue.ref("");
      const smsCode = vue.ref("");
      const password = vue.ref("");
      const confirmPassword = vue.ref("");
      const captchaSrc = vue.ref("/static/icons/captcha1.png");
      const isChecked = vue.ref(false);
      const countryList = vue.ref([
        { code: "+86", zh: "中国" },
        { code: "+44", zh: "英国" },
        { code: "+852", zh: "香港" },
        { code: "+853", zh: "澳门" },
        { code: "+886", zh: "台湾" },
        { code: "+65", zh: "新加坡" },
        { code: "+60", zh: "马来西亚" },
        { code: "+66", zh: "泰国" }
      ]);
      const selectedCountry = vue.ref("");
      const selectCountry = (e) => {
        const item = countryList.value[e.detail.value];
        selectedCountry.value = `${item.code} ${item.zh}`;
      };
      const refreshCaptcha = () => {
        const index = Math.floor(Math.random() * 3) + 1;
        captchaSrc.value = `/static/icons/captcha${index}.png`;
      };
      const getCode = () => {
        if (!phone.value) {
          uni.showToast({ title: "请输入手机号", icon: "none" });
          return;
        }
        uni.showToast({ title: "验证码已发送", icon: "success" });
      };
      const toggleCheck = () => {
        isChecked.value = !isChecked.value;
      };
      const register = () => {
        if (!phone.value || !captchaInput.value || !smsCode.value || !password.value || !confirmPassword.value) {
          uni.showToast({ title: "请填写完整信息", icon: "none" });
          return;
        }
        if (password.value !== confirmPassword.value) {
          uni.showToast({ title: "两次密码不一致", icon: "none" });
          return;
        }
        if (!/^[A-Za-z0-9]{6,20}$/.test(password.value)) {
          uni.showToast({ title: "密码格式错误（6-20位字母或数字）", icon: "none" });
          return;
        }
        uni.showToast({ title: "注册成功", icon: "success" });
        setTimeout(() => {
          uni.redirectTo({ url: "/pages/A0300_client_main_v01" });
        }, 1500);
      };
      const loginWithWeChat = () => {
        uni.showToast({ title: "微信快捷登录", icon: "none" });
      };
      const loginWithAlipay = () => {
        uni.showToast({ title: "支付宝快捷登录", icon: "none" });
      };
      vue.onMounted(() => {
        selectedCountry.value = `${countryList.value[0].code} ${countryList.value[0].zh}`;
      });
      const __returned__ = { phone, captchaInput, smsCode, password, confirmPassword, captchaSrc, isChecked, countryList, selectedCountry, selectCountry, refreshCaptcha, getCode, toggleCheck, register, loginWithWeChat, loginWithAlipay, ref: vue.ref, onMounted: vue.onMounted };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$y(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "page-title" }),
      vue.createElementVNode("view", { class: "card" }, [
        vue.createCommentVNode(" 手机号输入 "),
        vue.createElementVNode("view", { class: "input-group" }, [
          vue.createElementVNode("picker", {
            onChange: $setup.selectCountry,
            range: $setup.countryList,
            "range-key": "zh"
          }, [
            vue.createElementVNode(
              "view",
              { class: "input-picker" },
              vue.toDisplayString($setup.selectedCountry),
              1
              /* TEXT */
            )
          ], 40, ["range"]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.phone = $event),
              type: "number",
              placeholder: "请输入手机号"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.phone]
          ])
        ]),
        vue.createCommentVNode(" 图形验证码 "),
        vue.createElementVNode("view", { class: "input-group" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.captchaInput = $event),
              placeholder: "输入图形验证码"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.captchaInput]
          ]),
          vue.createElementVNode("view", {
            class: "captcha-wrapper",
            onClick: $setup.refreshCaptcha
          }, [
            vue.createElementVNode("image", {
              src: $setup.captchaSrc,
              class: "captcha-img"
            }, null, 8, ["src"]),
            vue.createElementVNode("text", { class: "captcha-text" }, "换一张")
          ])
        ]),
        vue.createCommentVNode(" 验证码 "),
        vue.createElementVNode("view", { class: "input-group" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.smsCode = $event),
              placeholder: "输入验证码"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.smsCode]
          ]),
          vue.createElementVNode("button", {
            class: "verify-btn",
            onClick: $setup.getCode
          }, "获取验证码")
        ]),
        vue.createCommentVNode(" 密码 "),
        vue.createElementVNode("view", { class: "input-group" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.password = $event),
              placeholder: "输入密码",
              password: ""
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.password]
          ])
        ]),
        vue.createCommentVNode(" 确认密码 "),
        vue.createElementVNode("view", { class: "input-group" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $setup.confirmPassword = $event),
              placeholder: "再次输入密码",
              password: ""
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.confirmPassword]
          ])
        ]),
        vue.createCommentVNode(" 密码提示 "),
        vue.createElementVNode("view", { class: "password-tip" }, " 密码须为6-20位字母或数字 "),
        vue.createCommentVNode(" 协议勾选 "),
        vue.createElementVNode("view", { class: "agreement" }, [
          vue.createElementVNode("checkbox", {
            checked: $setup.isChecked,
            onClick: $setup.toggleCheck
          }, null, 8, ["checked"]),
          vue.createElementVNode("text", { class: "agreement-text" }, "我已阅读并同意")
        ]),
        vue.createElementVNode("view", { class: "agreement" }, [
          vue.createElementVNode("navigator", {
            url: "/pages/A0306_client_privacy_policy_v01",
            class: "link"
          }, "《法律协议》"),
          vue.createElementVNode("text", { class: "divider" }, "|"),
          vue.createElementVNode("navigator", {
            url: "/pages/A0307_client_terms_of_service_v01",
            class: "link"
          }, "《服务协议》")
        ]),
        vue.createCommentVNode(" 注册按钮 "),
        vue.createElementVNode("button", {
          class: "login-btn",
          onClick: $setup.register
        }, "注册"),
        vue.createCommentVNode(" 已有账号登录 "),
        vue.createElementVNode("view", { class: "agreement" }, [
          vue.createElementVNode("navigator", {
            url: "/pages/A0002_client_login_v01",
            class: "link"
          }, "已有账号？立即登录")
        ])
      ]),
      vue.createCommentVNode(" 第三方快捷登录 "),
      vue.createElementVNode("view", { class: "third-login" }, [
        vue.createElementVNode("text", { class: "third-title" }),
        vue.createElementVNode("view", { class: "third-icons" }, [
          vue.createElementVNode("image", {
            src: _imports_0$3,
            class: "icon",
            onClick: $setup.loginWithWeChat
          }),
          vue.createElementVNode("image", {
            src: _imports_1,
            class: "icon",
            onClick: $setup.loginWithAlipay
          }),
          vue.createElementVNode("image", {
            src: _imports_2,
            class: "icon",
            onClick: _cache[5] || (_cache[5] = (...args) => _ctx.loginWithApple && _ctx.loginWithApple(...args))
          })
        ])
      ])
    ]);
  }
  const PagesA0003ClientRegisterV01 = /* @__PURE__ */ _export_sfc(_sfc_main$z, [["render", _sfc_render$y], ["__scopeId", "data-v-34d112b7"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0003_client_register_v01.vue"]]);
  const _sfc_main$y = {
    __name: "A0005_client_profile_detail_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const profile = vue.ref({
        avatarUrl: "/static/avatar.png",
        name: "小赛",
        phone: "07123456789",
        gender: "男",
        birth: "1990-01-01",
        verified: true,
        email: "zhangsan@example.com",
        address: "10 Downing Street, London",
        school: "University of Oxford",
        major: "Computer Science"
      });
      const goToEditPage = () => {
        uni.navigateTo({ url: "/pages/A0006_client_profile_complete_v01" });
      };
      const __returned__ = { profile, goToEditPage, ref: vue.ref };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$x(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "page-title" }),
      vue.createElementVNode("view", { class: "profile-card" }, [
        vue.createElementVNode("image", {
          src: $setup.profile.avatarUrl,
          class: "avatar"
        }, null, 8, ["src"]),
        vue.createElementVNode("view", { class: "field" }, [
          vue.createElementVNode("text", { class: "label" }, "姓名："),
          vue.createTextVNode(
            vue.toDisplayString($setup.profile.name),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "field" }, [
          vue.createElementVNode("text", { class: "label" }, "手机号："),
          vue.createTextVNode(
            vue.toDisplayString($setup.profile.phone),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "field" }, [
          vue.createElementVNode("text", { class: "label" }, "性别："),
          vue.createTextVNode(
            vue.toDisplayString($setup.profile.gender),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "field" }, [
          vue.createElementVNode("text", { class: "label" }, "出生日期："),
          vue.createTextVNode(
            vue.toDisplayString($setup.profile.birth),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "field" }, [
          vue.createElementVNode("text", { class: "label" }, "实名认证："),
          vue.createTextVNode(
            vue.toDisplayString($setup.profile.verified ? "已认证" : "未认证"),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "field" }, [
          vue.createElementVNode("text", { class: "label" }, "邮箱："),
          vue.createTextVNode(
            vue.toDisplayString($setup.profile.email),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "field" }, [
          vue.createElementVNode("text", { class: "label" }, "英国常驻地址："),
          vue.createTextVNode(
            vue.toDisplayString($setup.profile.address),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "field" }, [
          vue.createElementVNode("text", { class: "label" }, "英国学校："),
          vue.createTextVNode(
            vue.toDisplayString($setup.profile.school || "未填写"),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "field" }, [
          vue.createElementVNode("text", { class: "label" }, "专业："),
          vue.createTextVNode(
            vue.toDisplayString($setup.profile.major || "未填写"),
            1
            /* TEXT */
          )
        ]),
        vue.createCommentVNode(" 编辑资料跳转按钮 "),
        vue.createElementVNode("button", {
          class: "btn edit-btn",
          onClick: $setup.goToEditPage
        }, "🧾编辑资料")
      ])
    ]);
  }
  const PagesA0005ClientProfileDetailV01 = /* @__PURE__ */ _export_sfc(_sfc_main$y, [["render", _sfc_render$x], ["__scopeId", "data-v-e91a14cf"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0005_client_profile_detail_v01.vue"]]);
  const _sfc_main$x = {
    __name: "A0006_client_profile_complete_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const genderList = ["男", "女"];
      const form = vue.ref({
        name: "",
        phone: "",
        gender: "",
        birth: "",
        email: "",
        address: "",
        school: "",
        major: ""
      });
      const submit = () => {
        uni.redirectTo({ url: "/pages/A0300_client_main_v01" });
      };
      const __returned__ = { genderList, form, submit, ref: vue.ref };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$w(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "header" }, "编辑资料"),
      vue.createElementVNode("view", { class: "form-card" }, [
        vue.createElementVNode("view", { class: "form-group" }, [
          vue.createElementVNode("text", { class: "label" }, "姓名"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.form.name = $event),
              placeholder: "请输入姓名",
              class: "input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.name]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-group" }, [
          vue.createElementVNode("text", { class: "label" }, "手机号"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.form.phone = $event),
              placeholder: "请输入手机号",
              class: "input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.phone]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-group" }, [
          vue.createElementVNode("text", { class: "label" }, "性别"),
          vue.createElementVNode(
            "picker",
            {
              range: $setup.genderList,
              onChange: _cache[2] || (_cache[2] = (e) => $setup.form.gender = $setup.genderList[e.detail.value])
            },
            [
              vue.createElementVNode(
                "view",
                { class: "picker-value" },
                vue.toDisplayString($setup.form.gender || "请选择性别"),
                1
                /* TEXT */
              )
            ],
            32
            /* NEED_HYDRATION */
          )
        ]),
        vue.createElementVNode("view", { class: "form-group" }, [
          vue.createElementVNode("text", { class: "label" }, "出生日期"),
          vue.createElementVNode(
            "picker",
            {
              mode: "date",
              onChange: _cache[3] || (_cache[3] = (e) => $setup.form.birth = e.detail.value)
            },
            [
              vue.createElementVNode(
                "view",
                { class: "picker-value" },
                vue.toDisplayString($setup.form.birth || "请选择日期"),
                1
                /* TEXT */
              )
            ],
            32
            /* NEED_HYDRATION */
          )
        ]),
        vue.createElementVNode("view", { class: "form-group" }, [
          vue.createElementVNode("text", { class: "label" }, "邮箱"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $setup.form.email = $event),
              placeholder: "请输入邮箱",
              class: "input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.email]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-group" }, [
          vue.createElementVNode("text", { class: "label" }, "英国常驻地址"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $setup.form.address = $event),
              placeholder: "请输入地址",
              class: "input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.address]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-group" }, [
          vue.createElementVNode("text", { class: "label" }, "英国学校（可选）"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $setup.form.school = $event),
              placeholder: "例如：University of Leeds",
              class: "input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.school]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-group" }, [
          vue.createElementVNode("text", { class: "label" }, "专业（可选）"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $setup.form.major = $event),
              placeholder: "请输入专业名称",
              class: "input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.major]
          ])
        ]),
        vue.createElementVNode("button", {
          class: "submit-btn",
          onClick: $setup.submit
        }, "保存并返回")
      ])
    ]);
  }
  const PagesA0006ClientProfileCompleteV01 = /* @__PURE__ */ _export_sfc(_sfc_main$x, [["render", _sfc_render$w], ["__scopeId", "data-v-0e746aac"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0006_client_profile_complete_v01.vue"]]);
  const _sfc_main$w = {
    __name: "A0009_client_logout_confirm_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const loginAgain = () => {
        uni.redirectTo({
          url: "/pages/A0002_client_login_v01"
        });
      };
      const __returned__ = { loginAgain };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$v(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 顶部 ✅ 图标 "),
      vue.createElementVNode("view", { class: "icon" }, "🔆"),
      vue.createCommentVNode(" 提示标题 "),
      vue.createElementVNode("view", { class: "title" }, "您已退出账号"),
      vue.createCommentVNode(" 友好提示 "),
      vue.createElementVNode("view", { class: "subtitle" }, " 感谢您对中步的支持！ "),
      vue.createCommentVNode(" 友好提示 "),
      vue.createElementVNode("view", { class: "subtitle" }, " 中步出行 您英国的守护专家！ "),
      vue.createCommentVNode(" 按钮组 "),
      vue.createElementVNode("view", { class: "btn-group" }, [
        vue.createElementVNode("button", {
          class: "btn login-btn",
          onClick: $setup.loginAgain
        }, "🔐重新登录")
      ]),
      vue.createCommentVNode(" 底部版权 "),
      vue.createElementVNode("view", { class: "footer" }, "@2025 中步出行 版权所有")
    ]);
  }
  const PagesA0009ClientLogoutConfirmV01 = /* @__PURE__ */ _export_sfc(_sfc_main$w, [["render", _sfc_render$v], ["__scopeId", "data-v-7eebc39c"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0009_client_logout_confirm_v01.vue"]]);
  const _sfc_main$v = {
    __name: "A0101_client_order_service_type_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      function selectService(type) {
        let url = "";
        if (type === "pickup") {
          url = "/pages/A0102_client_order_pickup_v01";
        } else if (type === "dropoff") {
          url = "/pages/A0103_client_order_dropoff_v01";
        } else if (type === "point") {
          url = "/pages/A0104_client_order_point_v01";
        } else if (type === "charter") {
          url = "/pages/A0105_client_order_charter_v01";
        }
        if (url) {
          uni.navigateTo({ url });
        }
      }
      function goHome() {
        uni.redirectTo({
          url: "/pages/A0300_client_main_v01"
        });
      }
      const __returned__ = { selectService, goHome };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$u(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "title" }, "请您选择"),
      vue.createElementVNode("view", { class: "service-grid" }, [
        vue.createElementVNode("view", {
          class: "service-item pickup",
          onClick: _cache[0] || (_cache[0] = ($event) => $setup.selectService("pickup"))
        }, [
          vue.createElementVNode("text", { class: "label" }, "🛬接机")
        ]),
        vue.createElementVNode("view", {
          class: "service-item dropoff",
          onClick: _cache[1] || (_cache[1] = ($event) => $setup.selectService("dropoff"))
        }, [
          vue.createElementVNode("text", { class: "label" }, "🛫送机")
        ]),
        vue.createElementVNode("view", {
          class: "service-item point",
          onClick: _cache[2] || (_cache[2] = ($event) => $setup.selectService("point"))
        }, [
          vue.createElementVNode("text", { class: "label" }, "📍点对点")
        ]),
        vue.createElementVNode("view", {
          class: "service-item charter",
          onClick: _cache[3] || (_cache[3] = ($event) => $setup.selectService("charter"))
        }, [
          vue.createElementVNode("text", { class: "label" }, "🚘包车")
        ])
      ]),
      vue.createCommentVNode(" 底部提示语 "),
      vue.createElementVNode("view", { class: "tip-text" }, " 温馨提示：司机均通过实名认证，中步出行将为您保驾护航.请您乘车时全程系好安全带，祝您旅途平安愉快！ "),
      vue.createCommentVNode(" ✅ 新增：返回主页按钮 "),
      vue.createElementVNode("view", {
        class: "home-button",
        onClick: $setup.goHome
      }, "🏠 返回主页")
    ]);
  }
  const PagesA0101ClientOrderServiceTypeV01 = /* @__PURE__ */ _export_sfc(_sfc_main$v, [["render", _sfc_render$u], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0101_client_order_service_type_v01.vue"]]);
  const ON_LOAD = "onLoad";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const createHook = (lifecycle) => (hook, target = vue.getCurrentInstance()) => {
    !vue.isInSSRComponentSetup && vue.injectHook(lifecycle, hook, target);
  };
  const onLoad = /* @__PURE__ */ createHook(ON_LOAD);
  const _sfc_main$u = {
    __name: "A0102_client_order_pickup_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const airportList = [
        { zh: "希思罗机场", terminals: ["T2", "T3", "T4", "T5"] },
        { zh: "盖特威克机场", terminals: ["南S", "北N"] },
        { zh: "伦敦城市机场", terminals: [] },
        { zh: "卢顿机场", terminals: [] },
        { zh: "桑德兰机场", terminals: [] },
        { zh: "伦敦周边其它机场", terminals: [] },
        { zh: "曼城机场", terminals: ["T1", "T2", "T3"] },
        { zh: "爱丁堡机场", terminals: [] },
        { zh: "贝尔法斯特机场", terminals: [] },
        { zh: "贝尔法斯特国际机场", terminals: [] },
        { zh: "爱尔兰机场", terminals: [] }
      ];
      const airportDisplayList = vue.computed(() => airportList.map((item) => item.zh));
      const vehicleList = ["5座", "7座", "8座", "9座"];
      const selectedAirport = vue.ref("");
      const terminalOptions = vue.ref([]);
      const selectedTerminal = vue.ref("");
      const estimatedPrice = vue.ref("0");
      const minDate = vue.ref("");
      const today = /* @__PURE__ */ new Date();
      today.setDate(today.getDate() + 1);
      minDate.value = today.toISOString().split("T")[0];
      const form = vue.ref({
        flightNumber: "",
        pickupDate: "",
        pickupTime: "",
        dropoffAddress: "",
        vehicle: "",
        adults: "",
        childrenUnder2: "",
        children2To6: "",
        phone: "",
        wechat: "",
        remarks: "",
        babySeat: "none"
      });
      function handleBabySeatChange(e) {
        form.value.babySeat = e.detail.value;
      }
      function onAirportChange(e) {
        const index = e.detail.value;
        selectedAirport.value = airportDisplayList.value[index];
        terminalOptions.value = airportList[index].terminals;
        selectedTerminal.value = "";
      }
      function onTerminalChange(e) {
        selectedTerminal.value = terminalOptions.value[e.detail.value];
      }
      function filterNumber(field) {
        form.value[field] = form.value[field].replace(/\D/g, "");
      }
      function submitOrder() {
        var _a;
        if (!form.value.dropoffAddress)
          return uni.showToast({ title: "请输入出发地址", icon: "none" });
        if (!form.value.pickupDate)
          return uni.showToast({ title: "请选择送机日期", icon: "none" });
        if (!form.value.pickupTime)
          return uni.showToast({ title: "请选择送机时间", icon: "none" });
        if (!selectedAirport.value)
          return uni.showToast({ title: "请选择送达机场", icon: "none" });
        const matched = airportList.find((item) => item.zh === selectedAirport.value);
        if (((_a = matched == null ? void 0 : matched.terminals) == null ? void 0 : _a.length) > 0 && !selectedTerminal.value) {
          return uni.showToast({ title: "请选择航站楼", icon: "none" });
        }
        if (!form.value.flightNumber)
          return uni.showToast({ title: "请输入航班号", icon: "none" });
        if (!form.value.vehicle)
          return uni.showToast({ title: "请选择车型", icon: "none" });
        if (!form.value.phone)
          return uni.showToast({ title: "请输入电话", icon: "none" });
        formatAppLog("log", "at pages/A0102_client_order_pickup_v01.vue:161", "提交送机订单：", {
          ...form.value,
          airport: selectedAirport.value,
          terminal: selectedTerminal.value
        });
        uni.showToast({ title: "订单已提交", icon: "success" });
        setTimeout(() => {
          uni.navigateTo({
            url: "/pages/A0106_client_payment_v01"
          });
        }, 800);
      }
      function goBack() {
        uni.navigateBack();
      }
      const __returned__ = { airportList, airportDisplayList, vehicleList, selectedAirport, terminalOptions, selectedTerminal, estimatedPrice, minDate, today, form, handleBabySeatChange, onAirportChange, onTerminalChange, filterNumber, submitOrder, goBack, ref: vue.ref, computed: vue.computed };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$t(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("view", {
          class: "back-btn",
          onClick: $setup.goBack
        }),
        vue.createElementVNode("view", { class: "title" })
      ]),
      vue.createElementVNode("view", { class: "form-card" }, [
        vue.createCommentVNode(" 机场 + 航站楼 + 航班号 "),
        vue.createElementVNode("view", { class: "row-3" }, [
          vue.createElementVNode("picker", {
            range: $setup.airportDisplayList,
            onChange: $setup.onAirportChange
          }, [
            vue.createElementVNode(
              "view",
              { class: "picker airport-picker" },
              vue.toDisplayString($setup.selectedAirport || "机场"),
              1
              /* TEXT */
            )
          ], 40, ["range"]),
          vue.createElementVNode("picker", {
            range: $setup.terminalOptions,
            onChange: $setup.onTerminalChange
          }, [
            vue.createElementVNode(
              "view",
              { class: "picker terminal-picker" },
              vue.toDisplayString($setup.selectedTerminal || "航站楼"),
              1
              /* TEXT */
            )
          ], 40, ["range"]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.form.flightNumber = $event),
              type: "text",
              placeholder: "航班号",
              class: "flight-number"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.flightNumber]
          ])
        ]),
        vue.createCommentVNode(" 接机日期 + 接机时间 "),
        vue.createElementVNode("view", { class: "row-2" }, [
          vue.createElementVNode("picker", {
            mode: "date",
            start: $setup.minDate,
            onChange: _cache[1] || (_cache[1] = (e) => $setup.form.pickupDate = e.detail.value)
          }, [
            vue.createElementVNode(
              "view",
              { class: "picker pickup-date" },
              vue.toDisplayString($setup.form.pickupDate || "接机日期"),
              1
              /* TEXT */
            )
          ], 40, ["start"]),
          vue.createElementVNode(
            "picker",
            {
              mode: "time",
              onChange: _cache[2] || (_cache[2] = (e) => $setup.form.pickupTime = e.detail.value)
            },
            [
              vue.createElementVNode(
                "view",
                { class: "picker pickup-time" },
                vue.toDisplayString($setup.form.pickupTime || "接机时间"),
                1
                /* TEXT */
              )
            ],
            32
            /* NEED_HYDRATION */
          )
        ]),
        vue.createCommentVNode(" 送达地址 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.form.dropoffAddress = $event),
              type: "text",
              placeholder: "请输入送达地址",
              class: "dropoff-address"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.dropoffAddress]
          ])
        ]),
        vue.createCommentVNode(" 车辆选择 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.createElementVNode(
            "picker",
            {
              range: $setup.vehicleList,
              onChange: _cache[4] || (_cache[4] = (e) => $setup.form.vehicle = $setup.vehicleList[e.detail.value])
            },
            [
              vue.createElementVNode(
                "view",
                { class: "picker vehicle-picker" },
                vue.toDisplayString($setup.form.vehicle || "请选择车型"),
                1
                /* TEXT */
              )
            ],
            32
            /* NEED_HYDRATION */
          )
        ]),
        vue.createCommentVNode(" 人数 "),
        vue.createElementVNode("view", { class: "row-3" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $setup.form.adults = $event),
              type: "number",
              placeholder: "成人",
              class: "adult-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [
              vue.vModelText,
              $setup.form.adults,
              void 0,
              { number: true }
            ]
          ]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $setup.form.childrenUnder2 = $event),
              type: "number",
              placeholder: "2岁以下选填",
              class: "under2-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [
              vue.vModelText,
              $setup.form.childrenUnder2,
              void 0,
              { number: true }
            ]
          ]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $setup.form.children2To6 = $event),
              type: "number",
              placeholder: "2-6岁选填",
              class: "age2to6-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [
              vue.vModelText,
              $setup.form.children2To6,
              void 0,
              { number: true }
            ]
          ])
        ]),
        vue.createCommentVNode(" 电话 + 微信 "),
        vue.createElementVNode("view", { class: "row-2" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => $setup.form.phone = $event),
              type: "number",
              pattern: "\\d*",
              placeholder: "电话",
              class: "phone-input",
              onInput: _cache[9] || (_cache[9] = ($event) => $setup.filterNumber("phone"))
            },
            null,
            544
            /* NEED_HYDRATION, NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.phone]
          ]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => $setup.form.wechat = $event),
              type: "text",
              placeholder: "微信/WhatsApp",
              class: "wechat-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.wechat]
          ])
        ]),
        vue.createCommentVNode(" 备注 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.withDirectives(vue.createElementVNode(
            "textarea",
            {
              "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => $setup.form.remarks = $event),
              rows: "2",
              placeholder: "备注",
              class: "remarks-textarea"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.remarks]
          ])
        ]),
        vue.createElementVNode("view", { class: "tip" }, " 🚗 提示：接机免费等待时间为90分钟。因高峰期出关和行李问题，建议您在选着时间往后（如：延后60分钟），以避免落地后即开始计算额外等待费用。 "),
        vue.createCommentVNode(" 婴儿座椅（已修复部分） "),
        vue.createElementVNode("view", { class: "baby-seat" }, [
          vue.createElementVNode("view", { class: "label" }, "婴儿座椅"),
          vue.createElementVNode(
            "radio-group",
            { onChange: $setup.handleBabySeatChange },
            [
              vue.createElementVNode("label", null, [
                vue.createElementVNode("radio", {
                  value: "none",
                  checked: ""
                }),
                vue.createTextVNode(" 无")
              ]),
              vue.createElementVNode("label", null, [
                vue.createElementVNode("radio", { value: "0-2" }),
                vue.createTextVNode(" 0-2岁")
              ]),
              vue.createElementVNode("label", null, [
                vue.createElementVNode("radio", { value: "2-6" }),
                vue.createTextVNode(" 2-6岁")
              ])
            ],
            32
            /* NEED_HYDRATION */
          ),
          vue.createElementVNode("view", { class: "tip" }, "英国法律规定，儿童必须要有儿童座椅，请自备，避免产生费用。")
        ])
      ]),
      vue.createElementVNode("view", { class: "footer" }, [
        vue.createElementVNode(
          "view",
          { class: "price" },
          "预计价格：£" + vue.toDisplayString($setup.estimatedPrice),
          1
          /* TEXT */
        ),
        vue.createElementVNode("button", {
          class: "submit-btn",
          onClick: $setup.submitOrder
        }, "提交订单")
      ])
    ]);
  }
  const PagesA0102ClientOrderPickupV01 = /* @__PURE__ */ _export_sfc(_sfc_main$u, [["render", _sfc_render$t], ["__scopeId", "data-v-ebb825c2"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0102_client_order_pickup_v01.vue"]]);
  const _sfc_main$t = {
    __name: "A0103_client_order_dropoff_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const airportList = [
        { zh: "希思罗机场", terminals: ["T2", "T3", "T4", "T5"] },
        { zh: "盖特威克机场", terminals: ["南S", "北N"] },
        { zh: "伦敦城市机场", terminals: [] },
        { zh: "卢顿机场", terminals: [] },
        { zh: "桑德兰机场", terminals: [] },
        { zh: "伦敦周边其它机场", terminals: [] },
        { zh: "曼城机场", terminals: ["T1", "T2", "T3"] },
        { zh: "爱丁堡机场", terminals: [] },
        { zh: "贝尔法斯特机场", terminals: [] },
        { zh: "贝尔法斯特国际机场", terminals: [] },
        { zh: "爱尔兰机场", terminals: [] }
      ];
      const airportDisplayList = vue.computed(() => airportList.map((item) => item.zh));
      const vehicleList = ["5座", "7座", "8座", "9座"];
      const selectedAirport = vue.ref("");
      const terminalOptions = vue.ref([]);
      const selectedTerminal = vue.ref("");
      const estimatedPrice = vue.ref("0");
      const minDate = vue.ref("");
      const today = /* @__PURE__ */ new Date();
      today.setDate(today.getDate() + 1);
      minDate.value = today.toISOString().split("T")[0];
      const form = vue.ref({
        dropoffAddress: "",
        pickupDate: "",
        pickupTime: "",
        flightNumber: "",
        vehicle: "",
        adults: "",
        childrenUnder2: "",
        children2To6: "",
        phone: "",
        wechat: "",
        remarks: "",
        babySeat: "none"
      });
      function handleBabySeatChange(e) {
        form.value.babySeat = e.detail.value;
      }
      function onAirportChange(e) {
        const index = e.detail.value;
        selectedAirport.value = airportDisplayList.value[index];
        terminalOptions.value = airportList[index].terminals;
        selectedTerminal.value = "";
      }
      function onTerminalChange(e) {
        selectedTerminal.value = terminalOptions.value[e.detail.value];
      }
      function filterNumber(field) {
        form.value[field] = form.value[field].replace(/\D/g, "");
      }
      function submitOrder() {
        var _a;
        if (!form.value.dropoffAddress)
          return uni.showToast({ title: "请输入出发地址", icon: "none" });
        if (!form.value.pickupDate)
          return uni.showToast({ title: "请选择送机日期", icon: "none" });
        if (!form.value.pickupTime)
          return uni.showToast({ title: "请选择送机时间", icon: "none" });
        if (!selectedAirport.value)
          return uni.showToast({ title: "请选择送达机场", icon: "none" });
        const matched = airportList.find((item) => item.zh === selectedAirport.value);
        if (((_a = matched == null ? void 0 : matched.terminals) == null ? void 0 : _a.length) > 0 && !selectedTerminal.value) {
          return uni.showToast({ title: "请选择航站楼", icon: "none" });
        }
        if (!form.value.flightNumber)
          return uni.showToast({ title: "请输入航班号", icon: "none" });
        if (!form.value.vehicle)
          return uni.showToast({ title: "请选择车型", icon: "none" });
        if (!form.value.phone)
          return uni.showToast({ title: "请输入电话", icon: "none" });
        formatAppLog("log", "at pages/A0103_client_order_dropoff_v01.vue:163", "提交送机订单：", {
          ...form.value,
          airport: selectedAirport.value,
          terminal: selectedTerminal.value
        });
        uni.showToast({ title: "订单已提交", icon: "success" });
        setTimeout(() => {
          uni.navigateTo({
            url: "/pages/A0106_client_payment_v01"
          });
        }, 800);
      }
      function goBack() {
        uni.navigateBack();
      }
      const __returned__ = { airportList, airportDisplayList, vehicleList, selectedAirport, terminalOptions, selectedTerminal, estimatedPrice, minDate, today, form, handleBabySeatChange, onAirportChange, onTerminalChange, filterNumber, submitOrder, goBack, ref: vue.ref, computed: vue.computed };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$s(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 顶部返回 + 标题 "),
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("view", {
          class: "back-btn",
          onClick: $setup.goBack
        }),
        vue.createElementVNode("view", { class: "title" })
      ]),
      vue.createElementVNode("view", { class: "form-card" }, [
        vue.createCommentVNode(" 出发地址 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.form.dropoffAddress = $event),
              type: "text",
              placeholder: "请输入出发地址",
              class: "dropoff-address"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.dropoffAddress]
          ])
        ]),
        vue.createCommentVNode(" 送机日期 + 送机时间 "),
        vue.createElementVNode("view", { class: "row-2" }, [
          vue.createElementVNode("picker", {
            mode: "date",
            start: $setup.minDate,
            onChange: _cache[1] || (_cache[1] = (e) => $setup.form.pickupDate = e.detail.value)
          }, [
            vue.createElementVNode(
              "view",
              { class: "picker pickup-date" },
              vue.toDisplayString($setup.form.pickupDate || "送机日期"),
              1
              /* TEXT */
            )
          ], 40, ["start"]),
          vue.createElementVNode(
            "picker",
            {
              mode: "time",
              onChange: _cache[2] || (_cache[2] = (e) => $setup.form.pickupTime = e.detail.value)
            },
            [
              vue.createElementVNode(
                "view",
                { class: "picker pickup-time" },
                vue.toDisplayString($setup.form.pickupTime || "送机时间"),
                1
                /* TEXT */
              )
            ],
            32
            /* NEED_HYDRATION */
          )
        ]),
        vue.createCommentVNode(" 送达机场 + 航站楼 + 航班号 "),
        vue.createElementVNode("view", { class: "row-3" }, [
          vue.createElementVNode("picker", {
            range: $setup.airportDisplayList,
            onChange: $setup.onAirportChange
          }, [
            vue.createElementVNode(
              "view",
              { class: "picker airport-picker" },
              vue.toDisplayString($setup.selectedAirport || "送达机场"),
              1
              /* TEXT */
            )
          ], 40, ["range"]),
          vue.createElementVNode("picker", {
            range: $setup.terminalOptions,
            onChange: $setup.onTerminalChange
          }, [
            vue.createElementVNode(
              "view",
              { class: "picker terminal-picker" },
              vue.toDisplayString($setup.selectedTerminal || "航站楼"),
              1
              /* TEXT */
            )
          ], 40, ["range"]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.form.flightNumber = $event),
              type: "text",
              placeholder: "航班号",
              class: "flight-number"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.flightNumber]
          ])
        ]),
        vue.createCommentVNode(" 车型选择 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.createElementVNode(
            "picker",
            {
              range: $setup.vehicleList,
              onChange: _cache[4] || (_cache[4] = (e) => $setup.form.vehicle = $setup.vehicleList[e.detail.value])
            },
            [
              vue.createElementVNode(
                "view",
                { class: "picker vehicle-picker" },
                vue.toDisplayString($setup.form.vehicle || "请选择车型"),
                1
                /* TEXT */
              )
            ],
            32
            /* NEED_HYDRATION */
          )
        ]),
        vue.createCommentVNode(" 人数 "),
        vue.createElementVNode("view", { class: "row-3" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $setup.form.adults = $event),
              type: "number",
              placeholder: "成人",
              class: "adult-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [
              vue.vModelText,
              $setup.form.adults,
              void 0,
              { number: true }
            ]
          ]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $setup.form.childrenUnder2 = $event),
              type: "number",
              placeholder: "2岁以下选填",
              class: "under2-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [
              vue.vModelText,
              $setup.form.childrenUnder2,
              void 0,
              { number: true }
            ]
          ]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $setup.form.children2To6 = $event),
              type: "number",
              placeholder: "2-6岁选填",
              class: "age2to6-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [
              vue.vModelText,
              $setup.form.children2To6,
              void 0,
              { number: true }
            ]
          ])
        ]),
        vue.createCommentVNode(" 电话 + 微信 "),
        vue.createElementVNode("view", { class: "row-2" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => $setup.form.phone = $event),
              type: "number",
              pattern: "\\d*",
              placeholder: "电话",
              class: "phone-input",
              onInput: _cache[9] || (_cache[9] = ($event) => $setup.filterNumber("phone"))
            },
            null,
            544
            /* NEED_HYDRATION, NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.phone]
          ]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => $setup.form.wechat = $event),
              type: "text",
              placeholder: "微信/WhatsApp",
              class: "wechat-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.wechat]
          ])
        ]),
        vue.createCommentVNode(" 备注 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.withDirectives(vue.createElementVNode(
            "textarea",
            {
              "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => $setup.form.remarks = $event),
              rows: "2",
              placeholder: "备注",
              class: "remarks-textarea"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.remarks]
          ])
        ]),
        vue.createCommentVNode(" 提示改为送机版 "),
        vue.createElementVNode("view", { class: "tip" }, " 🚗 提示：建议至少提前5小时出发，以防高峰期交通拥堵影响航班。 "),
        vue.createCommentVNode(" 婴儿座椅（已修复） "),
        vue.createElementVNode("view", { class: "baby-seat" }, [
          vue.createElementVNode("view", { class: "label" }, "婴儿座椅"),
          vue.createElementVNode(
            "radio-group",
            { onChange: $setup.handleBabySeatChange },
            [
              vue.createElementVNode("label", null, [
                vue.createElementVNode("radio", {
                  value: "none",
                  checked: $setup.form.babySeat === "none"
                }, null, 8, ["checked"]),
                vue.createTextVNode(" 无")
              ]),
              vue.createElementVNode("label", null, [
                vue.createElementVNode("radio", {
                  value: "0-2",
                  checked: $setup.form.babySeat === "0-2"
                }, null, 8, ["checked"]),
                vue.createTextVNode(" 0-2岁")
              ]),
              vue.createElementVNode("label", null, [
                vue.createElementVNode("radio", {
                  value: "2-6",
                  checked: $setup.form.babySeat === "2-6"
                }, null, 8, ["checked"]),
                vue.createTextVNode(" 2-6岁")
              ])
            ],
            32
            /* NEED_HYDRATION */
          ),
          vue.createElementVNode("view", { class: "tip" }, "英国法律规定，儿童必须要有儿童座椅，请自备，避免产生费用。")
        ])
      ]),
      vue.createElementVNode("view", { class: "footer" }, [
        vue.createElementVNode(
          "view",
          { class: "price" },
          "预计价格：£" + vue.toDisplayString($setup.estimatedPrice),
          1
          /* TEXT */
        ),
        vue.createElementVNode("button", {
          class: "submit-btn",
          onClick: $setup.submitOrder
        }, "提交订单")
      ])
    ]);
  }
  const PagesA0103ClientOrderDropoffV01 = /* @__PURE__ */ _export_sfc(_sfc_main$t, [["render", _sfc_render$s], ["__scopeId", "data-v-38ce85c3"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0103_client_order_dropoff_v01.vue"]]);
  const _sfc_main$s = {
    __name: "A0104_client_order_point_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const vehicleList = ["5座", "7座", "8座", "9座"];
      const estimatedPrice = vue.ref("0");
      const today = /* @__PURE__ */ new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const minDate = tomorrow.toISOString().split("T")[0];
      const form = vue.ref({
        pickupAddress: "",
        dropoffAddress: "",
        pickupDate: "",
        pickupTime: "",
        flightNumber: "",
        vehicle: "",
        adults: "",
        childrenUnder2: "",
        children2To6: "",
        phone: "",
        wechat: "",
        remarks: "",
        babySeat: "none"
      });
      function handleBabySeatChange(e) {
        form.value.babySeat = e.detail.value;
      }
      function filterNumber(field) {
        form.value[field] = form.value[field].replace(/\D/g, "");
      }
      function submitOrder() {
        if (!form.value.pickupDate)
          return uni.showToast({ title: "请选择出发日期", icon: "none" });
        if (!form.value.pickupTime)
          return uni.showToast({ title: "请选择出发时间", icon: "none" });
        if (!form.value.pickupAddress)
          return uni.showToast({ title: "请输入出发地址", icon: "none" });
        if (!form.value.dropoffAddress)
          return uni.showToast({ title: "请输入目的地地址", icon: "none" });
        if (!form.value.vehicle)
          return uni.showToast({ title: "请选择车型", icon: "none" });
        if (!form.value.phone)
          return uni.showToast({ title: "请输入电话", icon: "none" });
        formatAppLog("log", "at pages/A0104_client_order_point_v01.vue:123", "提交订单：", form.value);
        uni.showToast({
          title: "订单已提交",
          icon: "success"
        });
        setTimeout(() => {
          uni.navigateTo({
            url: "/pages/A0106_client_payment_v01"
          });
        }, 800);
      }
      function goBack() {
        uni.navigateBack();
      }
      const __returned__ = { vehicleList, estimatedPrice, today, tomorrow, minDate, form, handleBabySeatChange, filterNumber, submitOrder, goBack, ref: vue.ref };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$r(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 顶部返回 + 标题 "),
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("view", {
          class: "back-btn",
          onClick: $setup.goBack
        }),
        vue.createElementVNode("view", { class: "title" })
      ]),
      vue.createElementVNode("view", { class: "form-card" }, [
        vue.createCommentVNode(" 出发地址 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.form.pickupAddress = $event),
              type: "text",
              placeholder: "请输入出发地址",
              class: "pickup-address"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.pickupAddress]
          ])
        ]),
        vue.createCommentVNode(" 目的地址 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.form.dropoffAddress = $event),
              type: "text",
              placeholder: "请输入目的地地址",
              class: "dropoff-address"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.dropoffAddress]
          ])
        ]),
        vue.createCommentVNode(" 出发日期 + 出发时间 "),
        vue.createElementVNode("view", { class: "row-2" }, [
          vue.createElementVNode("picker", {
            mode: "date",
            start: $setup.minDate,
            onChange: _cache[2] || (_cache[2] = (e) => $setup.form.pickupDate = e.detail.value)
          }, [
            vue.createElementVNode(
              "view",
              { class: "picker pickup-date" },
              vue.toDisplayString($setup.form.pickupDate || "出发日期"),
              1
              /* TEXT */
            )
          ], 40, ["start"]),
          vue.createElementVNode(
            "picker",
            {
              mode: "time",
              onChange: _cache[3] || (_cache[3] = (e) => $setup.form.pickupTime = e.detail.value)
            },
            [
              vue.createElementVNode(
                "view",
                { class: "picker pickup-time" },
                vue.toDisplayString($setup.form.pickupTime || "出发时间"),
                1
                /* TEXT */
              )
            ],
            32
            /* NEED_HYDRATION */
          )
        ]),
        vue.createCommentVNode(" 车型选择 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.createElementVNode(
            "picker",
            {
              range: $setup.vehicleList,
              onChange: _cache[4] || (_cache[4] = (e) => $setup.form.vehicle = $setup.vehicleList[e.detail.value])
            },
            [
              vue.createElementVNode(
                "view",
                { class: "picker vehicle-picker" },
                vue.toDisplayString($setup.form.vehicle || "请选择车型"),
                1
                /* TEXT */
              )
            ],
            32
            /* NEED_HYDRATION */
          )
        ]),
        vue.createCommentVNode(" 人数 "),
        vue.createElementVNode("view", { class: "row-3" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $setup.form.adults = $event),
              type: "number",
              placeholder: "成人",
              class: "adult-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [
              vue.vModelText,
              $setup.form.adults,
              void 0,
              { number: true }
            ]
          ]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $setup.form.childrenUnder2 = $event),
              type: "number",
              placeholder: "2岁以下选填",
              class: "under2-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [
              vue.vModelText,
              $setup.form.childrenUnder2,
              void 0,
              { number: true }
            ]
          ]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $setup.form.children2To6 = $event),
              type: "number",
              placeholder: "2-6岁选填",
              class: "age2to6-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [
              vue.vModelText,
              $setup.form.children2To6,
              void 0,
              { number: true }
            ]
          ])
        ]),
        vue.createCommentVNode(" 电话 + 微信 "),
        vue.createElementVNode("view", { class: "row-2" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => $setup.form.phone = $event),
              type: "number",
              pattern: "\\d*",
              placeholder: "电话",
              class: "phone-input",
              onInput: _cache[9] || (_cache[9] = ($event) => $setup.filterNumber("phone"))
            },
            null,
            544
            /* NEED_HYDRATION, NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.phone]
          ]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => $setup.form.wechat = $event),
              type: "text",
              placeholder: "微信/WhatsApp",
              class: "wechat-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.wechat]
          ])
        ]),
        vue.createCommentVNode(" 备注 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.withDirectives(vue.createElementVNode(
            "textarea",
            {
              "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => $setup.form.remarks = $event),
              rows: "2",
              placeholder: "备注",
              class: "remarks-textarea"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.remarks]
          ])
        ]),
        vue.createElementVNode("view", { class: "tip" }, " 🚗 提示：建议您合理预留出发时间，避免因交通状况耽误行程。 "),
        vue.createCommentVNode(" 婴儿座椅（已修复） "),
        vue.createElementVNode("view", { class: "baby-seat" }, [
          vue.createElementVNode("view", { class: "label" }, "婴儿座椅"),
          vue.createElementVNode(
            "radio-group",
            { onChange: $setup.handleBabySeatChange },
            [
              vue.createElementVNode("label", null, [
                vue.createElementVNode("radio", {
                  value: "none",
                  checked: $setup.form.babySeat === "none"
                }, null, 8, ["checked"]),
                vue.createTextVNode(" 无")
              ]),
              vue.createElementVNode("label", null, [
                vue.createElementVNode("radio", {
                  value: "0-2",
                  checked: $setup.form.babySeat === "0-2"
                }, null, 8, ["checked"]),
                vue.createTextVNode(" 0-2岁")
              ]),
              vue.createElementVNode("label", null, [
                vue.createElementVNode("radio", {
                  value: "2-6",
                  checked: $setup.form.babySeat === "2-6"
                }, null, 8, ["checked"]),
                vue.createTextVNode(" 2-6岁")
              ])
            ],
            32
            /* NEED_HYDRATION */
          ),
          vue.createElementVNode("view", { class: "tip" }, "英国法律规定，儿童必须要有儿童座椅，请自备，避免产生费用。")
        ])
      ]),
      vue.createCommentVNode(" 底部固定 "),
      vue.createElementVNode("view", { class: "footer" }, [
        vue.createElementVNode(
          "view",
          { class: "price" },
          "预计价格：£" + vue.toDisplayString($setup.estimatedPrice),
          1
          /* TEXT */
        ),
        vue.createElementVNode("button", {
          class: "submit-btn",
          onClick: $setup.submitOrder
        }, "提交订单")
      ])
    ]);
  }
  const PagesA0104ClientOrderPointV01 = /* @__PURE__ */ _export_sfc(_sfc_main$s, [["render", _sfc_render$r], ["__scopeId", "data-v-4ecac031"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0104_client_order_point_v01.vue"]]);
  const _sfc_main$r = {
    __name: "A0105_client_order_charter_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const vehicleList = ["5座", "7座", "8座", "9座"];
      const estimatedPrice = vue.ref("0");
      const today = /* @__PURE__ */ new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const minDate = tomorrow.toISOString().split("T")[0];
      const form = vue.ref({
        pickupAddress: "",
        dropoffAddress: "",
        pickupDate: "",
        pickupTime: "",
        flightNumber: "",
        vehicle: "",
        adults: "",
        childrenUnder2: "",
        children2To6: "",
        phone: "",
        wechat: "",
        remarks: "",
        babySeat: "none"
      });
      function handleBabySeatChange(e) {
        form.value.babySeat = e.detail.value;
      }
      function filterNumber(field) {
        form.value[field] = form.value[field].replace(/\D/g, "");
      }
      function submitOrder() {
        if (!form.value.pickupDate)
          return uni.showToast({ title: "请选择出发日期", icon: "none" });
        if (!form.value.pickupTime)
          return uni.showToast({ title: "请选择出发时间", icon: "none" });
        if (!form.value.pickupAddress)
          return uni.showToast({ title: "请输入出发地址", icon: "none" });
        if (!form.value.dropoffAddress)
          return uni.showToast({ title: "请输入目的地地址", icon: "none" });
        if (!form.value.vehicle)
          return uni.showToast({ title: "请选择车型", icon: "none" });
        if (!form.value.phone)
          return uni.showToast({ title: "请输入电话", icon: "none" });
        formatAppLog("log", "at pages/A0105_client_order_charter_v01.vue:124", "提交订单：", form.value);
        uni.showToast({
          title: "订单已提交",
          icon: "success"
        });
        setTimeout(() => {
          uni.navigateTo({
            url: "/pages/A0106_client_payment_v01"
          });
        }, 800);
      }
      function goBack() {
        uni.navigateBack();
      }
      const __returned__ = { vehicleList, estimatedPrice, today, tomorrow, minDate, form, handleBabySeatChange, filterNumber, submitOrder, goBack, ref: vue.ref };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$q(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 顶部返回 + 标题 "),
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("view", {
          class: "back-btn",
          onClick: $setup.goBack
        }),
        vue.createElementVNode("view", { class: "title" })
      ]),
      vue.createElementVNode("view", { class: "form-card" }, [
        vue.createCommentVNode(" 出发地址 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.form.pickupAddress = $event),
              type: "text",
              placeholder: "请输入出发地址",
              class: "pickup-address"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.pickupAddress]
          ])
        ]),
        vue.createCommentVNode(" 目的地址 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.form.dropoffAddress = $event),
              type: "text",
              placeholder: "请输入目的地地址",
              class: "dropoff-address"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.dropoffAddress]
          ])
        ]),
        vue.createCommentVNode(" 出发日期 + 出发时间 "),
        vue.createElementVNode("view", { class: "row-2" }, [
          vue.createElementVNode("picker", {
            mode: "date",
            value: $setup.form.pickupDate,
            start: $setup.minDate,
            onChange: _cache[2] || (_cache[2] = (e) => $setup.form.pickupDate = e.detail.value)
          }, [
            vue.createElementVNode(
              "view",
              { class: "picker pickup-date" },
              vue.toDisplayString($setup.form.pickupDate || "出发日期"),
              1
              /* TEXT */
            )
          ], 40, ["value", "start"]),
          vue.createElementVNode("picker", {
            mode: "time",
            value: $setup.form.pickupTime,
            onChange: _cache[3] || (_cache[3] = (e) => $setup.form.pickupTime = e.detail.value)
          }, [
            vue.createElementVNode(
              "view",
              { class: "picker pickup-time" },
              vue.toDisplayString($setup.form.pickupTime || "出发时间"),
              1
              /* TEXT */
            )
          ], 40, ["value"])
        ]),
        vue.createCommentVNode(" 车型选择 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.createElementVNode(
            "picker",
            {
              mode: "selector",
              range: $setup.vehicleList,
              onChange: _cache[4] || (_cache[4] = (e) => $setup.form.vehicle = $setup.vehicleList[e.detail.value])
            },
            [
              vue.createElementVNode(
                "view",
                { class: "picker vehicle-picker" },
                vue.toDisplayString($setup.form.vehicle || "请选择车型"),
                1
                /* TEXT */
              )
            ],
            32
            /* NEED_HYDRATION */
          )
        ]),
        vue.createCommentVNode(" 人数 "),
        vue.createElementVNode("view", { class: "row-3" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $setup.form.adults = $event),
              type: "number",
              placeholder: "成人",
              class: "adult-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [
              vue.vModelText,
              $setup.form.adults,
              void 0,
              { number: true }
            ]
          ]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $setup.form.childrenUnder2 = $event),
              type: "number",
              placeholder: "2岁以下选填",
              class: "under2-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [
              vue.vModelText,
              $setup.form.childrenUnder2,
              void 0,
              { number: true }
            ]
          ]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $setup.form.children2To6 = $event),
              type: "number",
              placeholder: "2-6岁选填",
              class: "age2to6-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [
              vue.vModelText,
              $setup.form.children2To6,
              void 0,
              { number: true }
            ]
          ])
        ]),
        vue.createCommentVNode(" 电话 + 微信 "),
        vue.createElementVNode("view", { class: "row-2" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => $setup.form.phone = $event),
              type: "number",
              pattern: "\\d*",
              placeholder: "电话",
              class: "phone-input",
              onInput: _cache[9] || (_cache[9] = ($event) => $setup.filterNumber("phone"))
            },
            null,
            544
            /* NEED_HYDRATION, NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.phone]
          ]),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => $setup.form.wechat = $event),
              type: "text",
              placeholder: "微信/WhatsApp",
              class: "wechat-input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.wechat]
          ])
        ]),
        vue.createCommentVNode(" 备注 "),
        vue.createElementVNode("view", { class: "row-full" }, [
          vue.withDirectives(vue.createElementVNode(
            "textarea",
            {
              "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => $setup.form.remarks = $event),
              rows: "2",
              placeholder: "备注",
              class: "remarks-textarea"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.remarks]
          ])
        ]),
        vue.createElementVNode("view", { class: "tip" }, " 🚗 提示：建议您合理预留出发时间，避免因交通状况耽误行程。 "),
        vue.createCommentVNode(" 婴儿座椅 "),
        vue.createElementVNode("view", { class: "baby-seat" }, [
          vue.createElementVNode("view", { class: "label" }, "婴儿座椅"),
          vue.createElementVNode(
            "radio-group",
            { onChange: $setup.handleBabySeatChange },
            [
              vue.createElementVNode("label", null, [
                vue.createElementVNode("radio", {
                  value: "none",
                  checked: $setup.form.babySeat === "none"
                }, null, 8, ["checked"]),
                vue.createTextVNode(" 无")
              ]),
              vue.createElementVNode("label", null, [
                vue.createElementVNode("radio", {
                  value: "0-2",
                  checked: $setup.form.babySeat === "0-2"
                }, null, 8, ["checked"]),
                vue.createTextVNode(" 0-2岁")
              ]),
              vue.createElementVNode("label", null, [
                vue.createElementVNode("radio", {
                  value: "2-6",
                  checked: $setup.form.babySeat === "2-6"
                }, null, 8, ["checked"]),
                vue.createTextVNode(" 2-6岁")
              ])
            ],
            32
            /* NEED_HYDRATION */
          ),
          vue.createElementVNode("view", { class: "tip" }, "英国法律规定，儿童必须要有儿童座椅，请自备，避免产生费用。")
        ])
      ]),
      vue.createCommentVNode(" 底部固定 "),
      vue.createElementVNode("view", { class: "footer" }, [
        vue.createElementVNode(
          "view",
          { class: "price" },
          "预计价格：£" + vue.toDisplayString($setup.estimatedPrice),
          1
          /* TEXT */
        ),
        vue.createElementVNode("button", {
          class: "submit-btn",
          onClick: $setup.submitOrder
        }, "提交订单")
      ])
    ]);
  }
  const PagesA0105ClientOrderCharterV01 = /* @__PURE__ */ _export_sfc(_sfc_main$r, [["render", _sfc_render$q], ["__scopeId", "data-v-cc55a02a"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0105_client_order_charter_v01.vue"]]);
  const _sfc_main$q = {
    __name: "A0106_client_payment_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const orderInfo = vue.ref({
        orderNumber: "202405060001",
        amount: "120.00",
        serviceType: "",
        status: "待支付"
      });
      const countdown = vue.ref("15:00");
      let timer = null;
      function startCountdown() {
        let totalSeconds = 15 * 60;
        timer = setInterval(() => {
          totalSeconds--;
          const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
          const seconds = String(totalSeconds % 60).padStart(2, "0");
          countdown.value = `${minutes}:${seconds}`;
          if (totalSeconds <= 0) {
            clearInterval(timer);
            countdown.value = "已超时";
          }
        }, 1e3);
      }
      function payNow() {
        uni.showToast({
          title: "支付成功",
          icon: "success",
          duration: 1500
          // 提示1.5秒
        });
        setTimeout(() => {
          uni.redirectTo({
            url: "/pages/A0107_client_wait_driver_v01"
          });
        }, 1500);
      }
      function goHome() {
        uni.reLaunch({
          url: "/pages/A0300_client_main_v01"
        });
      }
      onLoad((query) => {
        orderInfo.value.serviceType = query.serviceType || "点对点";
      });
      vue.onMounted(() => {
        startCountdown();
      });
      const __returned__ = { orderInfo, countdown, get timer() {
        return timer;
      }, set timer(v) {
        timer = v;
      }, startCountdown, payNow, goHome, ref: vue.ref, onMounted: vue.onMounted, get onLoad() {
        return onLoad;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$p(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "payment-page" }, [
      vue.createElementVNode("view", { class: "title" }, "支付订单"),
      vue.createElementVNode("view", { class: "order-info" }, [
        vue.createElementVNode("view", { class: "order-detail" }, [
          vue.createElementVNode("view", { class: "label" }, "订单编号："),
          vue.createElementVNode(
            "view",
            { class: "value" },
            vue.toDisplayString($setup.orderInfo.orderNumber),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "order-detail" }, [
          vue.createElementVNode("view", { class: "label" }, "金额："),
          vue.createElementVNode(
            "view",
            { class: "value" },
            "£" + vue.toDisplayString($setup.orderInfo.amount),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "order-detail" }, [
          vue.createElementVNode("view", { class: "label" }, "服务类型："),
          vue.createElementVNode(
            "view",
            { class: "value" },
            vue.toDisplayString($setup.orderInfo.serviceType),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "order-detail" }, [
          vue.createElementVNode("view", { class: "label" }, "支付状态："),
          vue.createElementVNode(
            "view",
            { class: "value" },
            vue.toDisplayString($setup.orderInfo.status),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode(
          "view",
          { class: "countdown" },
          "请在 " + vue.toDisplayString($setup.countdown) + " 内完成支付",
          1
          /* TEXT */
        )
      ]),
      vue.createElementVNode("view", { class: "button-group" }, [
        vue.createElementVNode("button", {
          class: "pay-button",
          onClick: $setup.payNow
        }, "立即支付")
      ]),
      vue.createCommentVNode(" 感谢提示 "),
      vue.createElementVNode("view", { class: "thank-you" }, [
        vue.createElementVNode("text", null, "感谢您对中步出行的支持，"),
        vue.createElementVNode("br"),
        vue.createElementVNode("text", null, "您的每一笔订单完成之后，"),
        vue.createElementVNode("br"),
        vue.createElementVNode("text", null, "会有一块钱捐给慈善基金，"),
        vue.createElementVNode("br"),
        vue.createElementVNode("text", null, "祝您生活愉快💗")
      ]),
      vue.createCommentVNode(" 支付结果弹窗 "),
      _ctx.showPopup ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "popup-wrapper"
      }, [
        vue.createElementVNode("view", { class: "popup" }, [
          vue.createElementVNode(
            "view",
            { class: "popup-title" },
            vue.toDisplayString(_ctx.popupTitle),
            1
            /* TEXT */
          ),
          vue.createElementVNode(
            "view",
            { class: "popup-message" },
            vue.toDisplayString(_ctx.popupMessage),
            1
            /* TEXT */
          ),
          vue.createElementVNode("view", { class: "popup-actions" }, [
            vue.createElementVNode("button", {
              onClick: _cache[0] || (_cache[0] = (...args) => _ctx.closePopup && _ctx.closePopup(...args))
            }, "关闭")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesA0106ClientPaymentV01 = /* @__PURE__ */ _export_sfc(_sfc_main$q, [["render", _sfc_render$p], ["__scopeId", "data-v-760eb68f"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0106_client_payment_v01.vue"]]);
  const _sfc_main$p = {
    __name: "A0106a_client_payment_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const amount = vue.ref(0);
      const selectedMethod = vue.ref("");
      vue.onMounted(() => {
        var _a;
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        amount.value = parseFloat((_a = currentPage.options) == null ? void 0 : _a.amount) || 0;
      });
      function selectMethod(method) {
        selectedMethod.value = method;
      }
      function handlePayment() {
        if (!selectedMethod.value) {
          uni.showToast({ title: "请选择支付方式", icon: "none" });
          return;
        }
        uni.showLoading({ title: "发起支付中...", mask: true });
        uni.requestPayment({
          provider: selectedMethod.value,
          orderInfo: {
            amount: amount.value.toString(),
            description: `司机打赏 £${amount.value}`
          },
          success: () => {
            uni.hideLoading();
            uni.showToast({
              title: "支付成功",
              icon: "success",
              success: () => {
                setTimeout(() => {
                  uni.redirectTo({ url: "/pages/A0300_client_main_v01" });
                }, 1500);
              }
            });
          },
          fail: (err) => {
            uni.hideLoading();
            uni.showToast({
              title: `支付失败: ${err.errMsg}`,
              icon: "none"
            });
          }
        });
      }
      const __returned__ = { amount, selectedMethod, selectMethod, handlePayment, ref: vue.ref, onMounted: vue.onMounted };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$o(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "payment-page" }, [
      vue.createCommentVNode(" 顶部欢迎信息 "),
      vue.createElementVNode("view", { class: "header-section" }, [
        vue.createElementVNode("view", { class: "header" }, [
          vue.createElementVNode("text", { class: "title" }, "感谢您对我们的服务的肯定")
        ]),
        vue.createElementVNode("view", { class: "header" }, [
          vue.createElementVNode("text", { class: "title" }, "期待您的下次用车服务")
        ])
      ]),
      vue.createCommentVNode(" 支付金额展示 "),
      vue.createElementVNode("view", { class: "amount-section" }, [
        vue.createElementVNode("text", { class: "amount-label" }, "打赏金额"),
        vue.createElementVNode(
          "text",
          { class: "amount" },
          "£" + vue.toDisplayString($setup.amount),
          1
          /* TEXT */
        )
      ]),
      vue.createCommentVNode(" 支付方式选择 "),
      vue.createElementVNode("view", { class: "payment-methods" }, [
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["method", { active: $setup.selectedMethod === "wechat" }]),
            onClick: _cache[0] || (_cache[0] = ($event) => $setup.selectMethod("wechat"))
          },
          [
            vue.createElementVNode("image", {
              src: _imports_0$3,
              class: "method-icon",
              mode: "aspectFit"
            }),
            vue.createElementVNode("text", { class: "method-text" }, "微信支付")
          ],
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["method", { active: $setup.selectedMethod === "alipay" }]),
            onClick: _cache[1] || (_cache[1] = ($event) => $setup.selectMethod("alipay"))
          },
          [
            vue.createElementVNode("image", {
              src: _imports_1,
              class: "method-icon",
              mode: "aspectFit"
            }),
            vue.createElementVNode("text", { class: "method-text" }, "支付宝")
          ],
          2
          /* CLASS */
        )
      ]),
      vue.createCommentVNode(" 支付按钮 "),
      vue.createElementVNode("button", {
        class: "pay-button",
        onClick: $setup.handlePayment,
        disabled: !$setup.selectedMethod
      }, " 立即支付 £" + vue.toDisplayString($setup.amount), 9, ["disabled"])
    ]);
  }
  const PagesA0106aClientPaymentV01 = /* @__PURE__ */ _export_sfc(_sfc_main$p, [["render", _sfc_render$o], ["__scopeId", "data-v-5b943bb3"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0106a_client_payment_v01.vue"]]);
  const _imports_0$2 = "/static/loading.gif";
  const _sfc_main$o = {
    __name: "A0107_client_wait_driver_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const order = vue.ref({
        departure: "伦敦 Heathrow",
        destination: "剑桥 University",
        date: "2025-05-06 10:30",
        orderId: "CNB202505060001",
        price: "88.00"
      });
      const waitingText = vue.ref("系统正在为您调度司机，请耐心等待......");
      let pollingTimer = null;
      const startPolling = (orderId) => {
        if (pollingTimer)
          clearInterval(pollingTimer);
        pollingTimer = setInterval(() => {
          formatAppLog("log", "at pages/A0107_client_wait_driver_v01.vue:81", "轮询检查司机接单状态...");
          uni.request({
            url: "/api/getOrderStatus",
            data: { orderId },
            success(res) {
              if (res.data.status === "accepted") {
                clearInterval(pollingTimer);
                uni.redirectTo({
                  url: "/pages/A0109_client_driver_info_v01"
                });
              }
            },
            fail() {
              formatAppLog("log", "at pages/A0107_client_wait_driver_v01.vue:94", "订单状态检查失败");
            }
          });
        }, 5e3);
      };
      const goBack = () => {
        uni.navigateTo({
          url: "/pages/A0106_client_payment_v01"
        });
      };
      const goHome = () => {
        uni.navigateTo({
          url: "/pages/A0300_client_main_v01"
        });
      };
      vue.onMounted(() => {
        startPolling();
      });
      const contactService = () => {
        uni.makePhoneCall({
          phoneNumber: "400-800-8888"
        });
      };
      function editOrder() {
        uni.navigateTo({
          url: "/pages/A0108_client_edit_order_v01"
        });
      }
      function mockInTrip() {
        uni.redirectTo({
          url: "/pages/A0110_client_in_trip_v01"
        });
      }
      vue.onUnmounted(() => {
        if (pollingTimer)
          clearInterval(pollingTimer);
      });
      const __returned__ = { order, waitingText, get pollingTimer() {
        return pollingTimer;
      }, set pollingTimer(v) {
        pollingTimer = v;
      }, startPolling, goBack, goHome, contactService, editOrder, mockInTrip, ref: vue.ref, onMounted: vue.onMounted, onUnmounted: vue.onUnmounted };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$n(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 顶部导航栏 "),
      vue.createElementVNode("view", { class: "nav-bar" }, [
        vue.createElementVNode("view", { class: "nav-left" }, [
          vue.createElementVNode("view", {
            class: "back-btn",
            onClick: $setup.goBack
          })
        ]),
        vue.createElementVNode("view", { class: "nav-title" }),
        vue.createElementVNode("view", { class: "nav-right" }, [
          vue.createElementVNode("view", {
            class: "home-btn",
            onClick: $setup.goHome
          })
        ])
      ]),
      vue.createElementVNode("view", { class: "wait-driver-page" }, [
        vue.createCommentVNode(" 状态卡片 "),
        vue.createElementVNode("view", { class: "status-card" }, [
          vue.createElementVNode("view", { class: "status-row" }, [
            vue.createElementVNode("text", { class: "status-title" }, "您的订单已锁定")
          ]),
          vue.createElementVNode("view", { class: "status-row subtitle" }, [
            vue.createElementVNode("text", null, "系统正在为您安排司机")
          ]),
          vue.createElementVNode("view", { class: "order-info" }, [
            vue.createElementVNode("view", { class: "row" }, [
              vue.createElementVNode("view", { class: "label" }, "出发地："),
              vue.createElementVNode(
                "view",
                { class: "value" },
                vue.toDisplayString($setup.order.departure),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "row" }, [
              vue.createElementVNode("view", { class: "label" }, "目的地："),
              vue.createElementVNode(
                "view",
                { class: "value" },
                vue.toDisplayString($setup.order.destination),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "row" }, [
              vue.createElementVNode("view", { class: "label" }, "出发时间："),
              vue.createElementVNode(
                "view",
                { class: "value" },
                vue.toDisplayString($setup.order.date),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "row" }, [
              vue.createElementVNode("view", { class: "label" }, "订单编号："),
              vue.createElementVNode(
                "view",
                { class: "value" },
                vue.toDisplayString($setup.order.orderId),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "row" }, [
              vue.createElementVNode("view", { class: "label" }, "已支付金额："),
              vue.createElementVNode(
                "view",
                { class: "value price" },
                "£" + vue.toDisplayString($setup.order.price),
                1
                /* TEXT */
              )
            ])
          ])
        ]),
        vue.createCommentVNode(" 等待动画 "),
        vue.createElementVNode("view", { class: "loading-section" }, [
          vue.createElementVNode("image", {
            src: _imports_0$2,
            class: "loading-icon"
          }),
          vue.createElementVNode(
            "view",
            { class: "waiting-text" },
            vue.toDisplayString($setup.waitingText),
            1
            /* TEXT */
          )
        ]),
        vue.createCommentVNode(" 操作按钮 "),
        vue.createElementVNode("view", { class: "action-buttons" }, [
          vue.createElementVNode("button", {
            class: "edit-btn",
            onClick: $setup.editOrder
          }, "修改订单")
        ]),
        vue.createElementVNode("button", { onClick: $setup.mockInTrip }, "模拟开始行程")
      ])
    ]);
  }
  const PagesA0107ClientWaitDriverV01 = /* @__PURE__ */ _export_sfc(_sfc_main$o, [["render", _sfc_render$n], ["__scopeId", "data-v-d9e6cee9"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0107_client_wait_driver_v01.vue"]]);
  const _sfc_main$n = {
    __name: "A0108_client_edit_order_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const orderInfo = vue.ref({
        from: "",
        // 出发地地址+邮编
        to: "",
        // 目的地地址+邮编
        time: ""
      });
      const date = vue.ref("");
      const time = vue.ref("");
      const startDate = vue.computed(() => {
        const tomorrow = /* @__PURE__ */ new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return formatDate(tomorrow);
      });
      const endDate = vue.computed(() => {
        const nextYear = /* @__PURE__ */ new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return formatDate(nextYear);
      });
      function formatDate(date2) {
        const year = date2.getFullYear();
        const month = String(date2.getMonth() + 1).padStart(2, "0");
        const day = String(date2.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
      function bindDateChange(e) {
        date.value = e.detail.value;
        updateDateTime();
      }
      function bindTimeChange(e) {
        time.value = e.detail.value;
        updateDateTime();
      }
      function updateDateTime() {
        if (date.value && time.value) {
          orderInfo.value.time = `${date.value} ${time.value}`;
        }
      }
      function saveOrder() {
        if (!orderInfo.value.from || !orderInfo.value.to || !orderInfo.value.time) {
          uni.showToast({
            title: "请填写完整信息",
            icon: "none"
          });
          return;
        }
        uni.showToast({
          title: "修改成功",
          icon: "success"
        });
        setTimeout(() => {
          uni.reLaunch({
            url: "/pages/A0107_client_wait_driver_v01"
          });
        }, 1500);
      }
      function goBack() {
        uni.navigateBack();
      }
      const __returned__ = { orderInfo, date, time, startDate, endDate, formatDate, bindDateChange, bindTimeChange, updateDateTime, saveOrder, goBack, ref: vue.ref, computed: vue.computed };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$m(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createCommentVNode(" 顶部导航 "),
      vue.createElementVNode("view", { class: "nav-bar" }, [
        vue.createElementVNode("text", {
          class: "back",
          onClick: $setup.goBack
        }, "← 返回"),
        vue.createElementVNode("text", { class: "title" }, "修改订单")
      ]),
      vue.createCommentVNode(" 表单区域 "),
      vue.createElementVNode("view", { class: "form" }, [
        vue.createCommentVNode(" 出发地（地址+邮编） "),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "出发地"),
          vue.withDirectives(vue.createElementVNode(
            "textarea",
            {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.orderInfo.from = $event),
              placeholder: "请输入出发地地址和邮编",
              class: "combined-field",
              "auto-height": ""
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.orderInfo.from]
          ])
        ]),
        vue.createCommentVNode(" 目的地（地址+邮编） "),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "目的地"),
          vue.withDirectives(vue.createElementVNode(
            "textarea",
            {
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.orderInfo.to = $event),
              placeholder: "请输入目的地地址和邮编",
              class: "combined-field",
              "auto-height": ""
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.orderInfo.to]
          ])
        ]),
        vue.createCommentVNode(" 出发日期与时间 "),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "出发日期与时间"),
          vue.createElementVNode("view", { class: "datetime-picker" }, [
            vue.createElementVNode("picker", {
              mode: "date",
              value: $setup.date,
              start: $setup.startDate,
              end: $setup.endDate,
              onChange: $setup.bindDateChange
            }, [
              vue.createElementVNode(
                "view",
                { class: "picker" },
                vue.toDisplayString($setup.date || "选择日期"),
                1
                /* TEXT */
              )
            ], 40, ["value", "start", "end"]),
            vue.createElementVNode("picker", {
              mode: "time",
              value: $setup.time,
              onChange: $setup.bindTimeChange
            }, [
              vue.createElementVNode(
                "view",
                { class: "picker" },
                vue.toDisplayString($setup.time || "选择时间"),
                1
                /* TEXT */
              )
            ], 40, ["value"])
          ])
        ])
      ]),
      vue.createCommentVNode(" 按钮 "),
      vue.createElementVNode("view", { class: "btn-group" }, [
        vue.createElementVNode("button", {
          class: "btn-primary",
          onClick: $setup.saveOrder
        }, "保存修改"),
        vue.createElementVNode("button", {
          class: "btn-white",
          onClick: $setup.goBack
        }, "取消")
      ]),
      vue.createCommentVNode(" 底部版权 "),
      vue.createElementVNode("view", { class: "footer" }, "@2025 赛博出行 版权所有")
    ]);
  }
  const PagesA0108ClientEditOrderV01 = /* @__PURE__ */ _export_sfc(_sfc_main$n, [["render", _sfc_render$m], ["__scopeId", "data-v-dc08b233"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0108_client_edit_order_v01.vue"]]);
  const _sfc_main$m = {
    __name: "A0109_client_driver_info_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const driver = vue.ref({
        name: "张师傅",
        phone: "138-0000-0000",
        rating: 4.8,
        avatar: "/static/driver_avatar.png",
        vehicle: "丰田 Camry 2023款 2.5L 豪华版",
        plateNumber: "粤B·12345"
      });
      const callDriver = () => {
        uni.makePhoneCall({
          phoneNumber: driver.value.phone
        });
      };
      const callService = () => {
        uni.makePhoneCall({
          phoneNumber: "400-800-8888"
        });
      };
      function mockInTrip() {
        uni.redirectTo({
          url: "/pages/A0110_client_in_trip_v01"
        });
      }
      const goBack = () => {
        uni.navigateBack();
      };
      const __returned__ = { driver, callDriver, callService, mockInTrip, goBack, ref: vue.ref };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$l(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "driver-info-page" }, [
      vue.createCommentVNode(" 顶部导航栏 "),
      vue.createElementVNode("view", { class: "nav-bar" }, [
        vue.createElementVNode("view", { class: "nav-left" }, [
          vue.createElementVNode("view", {
            class: "back-btn",
            onClick: $setup.goBack
          }, "＜ 返回")
        ]),
        vue.createElementVNode("view", { class: "nav-title" }, "司机信息页"),
        vue.createElementVNode("view", { class: "nav-right" })
      ]),
      vue.createCommentVNode(" 司机信息卡片 "),
      vue.createElementVNode("view", { class: "driver-card" }, [
        vue.createElementVNode("view", { class: "driver-header" }, [
          vue.createElementVNode("image", {
            class: "avatar",
            src: $setup.driver.avatar
          }, null, 8, ["src"]),
          vue.createElementVNode("view", { class: "driver-details" }, [
            vue.createElementVNode("view", { class: "driver-name-rating" }, [
              vue.createElementVNode(
                "text",
                { class: "driver-name" },
                vue.toDisplayString($setup.driver.name),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "driver-rating" },
                vue.toDisplayString($setup.driver.rating) + " ⭐",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "driver-phone" }, [
              vue.createElementVNode("text", { class: "iconfont icon-phone" }, "📱"),
              vue.createTextVNode(
                " " + vue.toDisplayString($setup.driver.phone),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "driver-info-item" }, [
              vue.createElementVNode("text", { class: "iconfont icon-car" }, "🚗"),
              vue.createTextVNode(
                " " + vue.toDisplayString($setup.driver.vehicle),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "driver-info-item" }, [
              vue.createElementVNode("text", { class: "iconfont icon-plate" }, "🔢"),
              vue.createTextVNode(
                " " + vue.toDisplayString($setup.driver.plateNumber),
                1
                /* TEXT */
              )
            ])
          ])
        ])
      ]),
      vue.createCommentVNode(" 温馨提示 "),
      vue.createElementVNode("view", { class: "notice" }, [
        vue.createElementVNode("text", { class: "iconfont icon-notice" }, "ℹ️"),
        vue.createTextVNode(" 请保持手机畅通，司机将在预计时间内到达上车地点。 "),
        vue.createElementVNode("br"),
        vue.createTextVNode("如有问题请及时联系客服。 ")
      ]),
      vue.createCommentVNode(" 操作按钮 "),
      vue.createElementVNode("view", { class: "action-buttons" }, [
        vue.createElementVNode("button", {
          class: "contact-driver",
          onClick: $setup.callDriver
        }, [
          vue.createElementVNode("text", { class: "iconfont icon-call" }, "📞"),
          vue.createTextVNode(" 联系司机 ")
        ]),
        vue.createElementVNode("button", {
          class: "contact-service",
          onClick: $setup.callService
        }, [
          vue.createElementVNode("text", { class: "iconfont icon-service" }, "👨‍💼"),
          vue.createTextVNode(" 联系客服 ")
        ])
      ]),
      vue.createCommentVNode(" 底部版权 "),
      vue.createElementVNode("view", { class: "footer" }, "@2025 赛博出行 版权所有")
    ]);
  }
  const PagesA0109ClientDriverInfoV01 = /* @__PURE__ */ _export_sfc(_sfc_main$m, [["render", _sfc_render$l], ["__scopeId", "data-v-18689f35"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0109_client_driver_info_v01.vue"]]);
  const _sfc_main$l = {
    __name: "A0110_client_in_trip_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const driver = vue.ref({
        name: "李师傅",
        phone: "138-1111-2222",
        avatar: "/static/driver_avatar.png",
        plateNumber: "粤B·54321"
      });
      onLoad(() => {
        formatAppLog("log", "at pages/A0110_client_in_trip_v01.vue:82", "✅ 已进入 A0110_client_in_trip_v01 页面");
      });
      vue.onMounted(() => {
        uni.showToast({
          title: "行程已开始",
          icon: "success"
        });
      });
      const sos = () => {
        uni.showModal({
          title: "紧急求助",
          content: "您确定要发起紧急求助吗？",
          success: function(res) {
            if (res.confirm) {
              uni.showToast({
                title: "求助已发出",
                icon: "success"
              });
            }
          }
        });
      };
      const callService = () => {
        uni.makePhoneCall({
          phoneNumber: "400-800-8888"
        });
      };
      const shareTrip = () => {
        uni.showToast({
          title: "生成行程分享链接",
          icon: "none"
        });
      };
      const shareSocial = () => {
        uni.showToast({
          title: "打开社交平台分享",
          icon: "none"
        });
      };
      const mockInTrip = () => {
        uni.redirectTo({
          url: "/pages/A0111_client_trip_completed_v01"
        });
      };
      const goBack = () => {
        uni.navigateBack();
      };
      const __returned__ = { driver, sos, callService, shareTrip, shareSocial, mockInTrip, goBack, ref: vue.ref, onMounted: vue.onMounted, get onLoad() {
        return onLoad;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$k(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "in-trip-page" }, [
      vue.createCommentVNode(" 顶部导航栏 "),
      vue.createElementVNode("view", { class: "nav-bar" }, [
        vue.createElementVNode("view", { class: "nav-left" }, [
          vue.createElementVNode("view", {
            class: "back-btn",
            onClick: $setup.goBack
          })
        ]),
        vue.createElementVNode("view", { class: "nav-title" }),
        vue.createElementVNode("view", { class: "nav-right" })
      ]),
      vue.createCommentVNode(" 行程状态 "),
      vue.createElementVNode("view", { class: "trip-status" }, [
        vue.createElementVNode("view", { class: "status-detail" }, "司机正在前往目的地...")
      ]),
      vue.createCommentVNode(" 司机和车辆信息 "),
      vue.createElementVNode("view", { class: "driver-card" }, [
        vue.createElementVNode("view", { class: "driver-header" }, [
          vue.createElementVNode("image", {
            class: "avatar",
            src: $setup.driver.avatar
          }, null, 8, ["src"]),
          vue.createElementVNode("view", { class: "driver-details" }, [
            vue.createElementVNode("view", { class: "driver-name-rating" }, [
              vue.createElementVNode(
                "text",
                { class: "driver-name" },
                vue.toDisplayString($setup.driver.name),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "driver-info-item" }, [
              vue.createElementVNode("text", { class: "iconfont icon-phone" }, "📱"),
              vue.createTextVNode(
                " " + vue.toDisplayString($setup.driver.phone),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "driver-info-item" }, [
              vue.createElementVNode("text", { class: "iconfont icon-plate" }, "🚗"),
              vue.createTextVNode(
                " " + vue.toDisplayString($setup.driver.plateNumber),
                1
                /* TEXT */
              )
            ])
          ])
        ])
      ]),
      vue.createCommentVNode(" 温馨提示 "),
      vue.createElementVNode("view", { class: "notice" }, [
        vue.createElementVNode("text", { class: "iconfont icon-notice" }, "ℹ️"),
        vue.createTextVNode(" 为了您的安全，请全程系好安全带。 ")
      ]),
      vue.createCommentVNode(" 操作按钮 "),
      vue.createElementVNode("view", { class: "action-buttons" }, [
        vue.createElementVNode("button", {
          class: "sos-btn",
          onClick: $setup.sos
        }, [
          vue.createElementVNode("text", { class: "iconfont icon-sos" }, "🆘"),
          vue.createTextVNode(" 一键求助 ")
        ]),
        vue.createElementVNode("button", {
          class: "contact-service",
          onClick: $setup.callService
        }, [
          vue.createElementVNode("text", { class: "iconfont icon-service" }, "👨‍💼"),
          vue.createTextVNode(" 联系客服 ")
        ])
      ]),
      vue.createCommentVNode(" 分享按钮 "),
      vue.createElementVNode("view", { class: "share-buttons" }, [
        vue.createElementVNode("button", {
          class: "share-trip",
          onClick: $setup.shareTrip
        }, [
          vue.createElementVNode("text", { class: "iconfont icon-share" }, "🔗"),
          vue.createTextVNode(" 行程分享 ")
        ]),
        vue.createElementVNode("button", {
          class: "share-social",
          onClick: $setup.shareSocial
        }, [
          vue.createElementVNode("text", { class: "iconfont icon-social" }, "📱"),
          vue.createTextVNode(" 分享至小红书 ")
        ])
      ]),
      vue.createElementVNode("button", { onClick: $setup.mockInTrip }, "模拟开始行程")
    ]);
  }
  const PagesA0110ClientInTripV01 = /* @__PURE__ */ _export_sfc(_sfc_main$l, [["render", _sfc_render$k], ["__scopeId", "data-v-6263e8e2"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0110_client_in_trip_v01.vue"]]);
  const _imports_0$1 = "/static/complete_icon.png";
  const _sfc_main$k = {
    __name: "A0111_client_trip_completed_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const goHome = () => {
        uni.reLaunch({
          url: "/pages/A0300_client_main_v01"
        });
      };
      const goRating = () => {
        uni.navigateTo({
          url: "/pages/A0201_client_rating_v01"
        });
      };
      const goDonate = () => {
        uni.showModal({
          title: "公益捐赠说明",
          content: "我们承诺：每完成一笔行程订单，平台将捐赠 1 元人民币给慈善基金，用于帮助困难家庭、儿童教育及灾区援助等公益项目。感谢您的每一次出行，温暖将伴随每一程。"
        });
      };
      const __returned__ = { goHome, goRating, goDonate };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$j(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 行程完成图标 "),
      vue.createElementVNode("image", {
        class: "icon",
        src: _imports_0$1,
        mode: "widthFix"
      }),
      vue.createCommentVNode(" 文案 "),
      vue.createElementVNode("text", { class: "title" }),
      vue.createElementVNode("text", { class: "desc" }, "感谢您使用"),
      vue.createElementVNode("text", { class: "desc" }, "中步出行"),
      vue.createElementVNode("text", { class: "desc" }, "订单已完成"),
      vue.createElementVNode("text", { class: "desc" }, "我们下次再约！"),
      vue.createCommentVNode(" 按钮组 "),
      vue.createElementVNode("view", { class: "button-group" }, [
        vue.createElementVNode("button", {
          class: "btn btn-home",
          onClick: $setup.goHome
        }, "返回首页"),
        vue.createElementVNode("button", {
          class: "btn btn-rate",
          onClick: $setup.goRating
        }, "评价司机")
      ]),
      vue.createCommentVNode(" 捐赠提示 "),
      vue.createElementVNode("view", {
        class: "donate-box",
        onClick: $setup.goDonate
      }, [
        vue.createElementVNode("text", { class: "donate-text" }, [
          vue.createTextVNode(" ❤️ 您每完成一笔订单，我们将捐出 1元给慈善基金。 "),
          vue.createElementVNode("text", { class: "donate-link" }, "点击了解更多 >")
        ])
      ])
    ]);
  }
  const PagesA0111ClientTripCompletedV01 = /* @__PURE__ */ _export_sfc(_sfc_main$k, [["render", _sfc_render$j], ["__scopeId", "data-v-e62bf269"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0111_client_trip_completed_v01.vue"]]);
  const _sfc_main$j = {
    __name: "A0201_client_rating_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const rating = vue.ref(0);
      const tagOptions = ["准时", "车干净", "服务好", "态度好", "价格合理"];
      const selectedTags = vue.ref([]);
      const suggestion = vue.ref("");
      const selectedTip = vue.ref(null);
      const currentOrderId = vue.ref("");
      const tipOptions = [
        { amount: 2, emoji: "🥤" },
        { amount: 5, emoji: "🍱" },
        { amount: 10, emoji: "💷" }
      ];
      vue.onMounted(() => {
        const pages = getCurrentPages();
        if (pages.length > 0) {
          currentOrderId.value = pages[pages.length - 1].options.orderId || "";
        }
      });
      function toggleTag(tag) {
        const index = selectedTags.value.indexOf(tag);
        if (index > -1) {
          selectedTags.value.splice(index, 1);
        } else {
          selectedTags.value.push(tag);
        }
      }
      function selectTip(amount) {
        selectedTip.value = selectedTip.value === amount ? null : amount;
      }
      async function submitRating() {
        if (rating.value === 0) {
          uni.showToast({ title: "请先评分", icon: "none" });
          return;
        }
        uni.showLoading({ title: "提交中..." });
        formatAppLog("log", "at pages/A0201_client_rating_v01.vue:111", "评价提交成功：", {
          orderId: currentOrderId.value,
          rating: rating.value,
          tags: selectedTags.value,
          suggestion: suggestion.value
        });
        await new Promise((resolve) => setTimeout(resolve, 800));
        uni.hideLoading();
        if (selectedTip.value) {
          uni.navigateTo({
            url: `/pages/A0106a_client_payment_v01?amount=${selectedTip.value}&orderId=${currentOrderId.value}&paymentType=tip`
          });
        } else {
          uni.showToast({ title: "评价成功", icon: "success" });
          setTimeout(() => {
            uni.redirectTo({ url: "/pages/A0300_client_main_v01" });
          }, 1500);
        }
      }
      const __returned__ = { rating, tagOptions, selectedTags, suggestion, selectedTip, currentOrderId, tipOptions, toggleTag, selectTip, submitRating, ref: vue.ref, onMounted: vue.onMounted };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$i(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 星级评分 "),
      vue.createElementVNode("view", { class: "rating" }, [
        vue.createElementVNode("text", null, "综合评分："),
        vue.createElementVNode("view", { class: "stars" }, [
          (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList(5, (n) => {
              return vue.createElementVNode("text", {
                key: n,
                onClick: ($event) => $setup.rating = n,
                class: vue.normalizeClass(["star", { active: n <= $setup.rating }])
              }, "★", 10, ["onClick"]);
            }),
            64
            /* STABLE_FRAGMENT */
          ))
        ])
      ]),
      vue.createCommentVNode(" 标签选择 "),
      vue.createElementVNode("view", { class: "tag-section" }, [
        vue.createElementVNode("text", { class: "tag-title" }, "评价亮点："),
        vue.createElementVNode("view", { class: "tags" }, [
          (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.tagOptions, (tag) => {
              return vue.createElementVNode("text", {
                key: tag,
                class: vue.normalizeClass(["tag", { selected: $setup.selectedTags.includes(tag) }]),
                onClick: ($event) => $setup.toggleTag(tag)
              }, vue.toDisplayString(tag), 11, ["onClick"]);
            }),
            64
            /* STABLE_FRAGMENT */
          ))
        ])
      ]),
      vue.createCommentVNode(" 建议填写 "),
      vue.createElementVNode("view", { class: "textarea-section" }, [
        vue.createElementVNode("text", { class: "label" }, "建议反馈（选填）"),
        vue.withDirectives(vue.createElementVNode(
          "textarea",
          {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.suggestion = $event),
            placeholder: "欢迎告诉我们您的建议..."
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.suggestion]
        ])
      ]),
      vue.createCommentVNode(" 打赏功能 "),
      vue.createElementVNode("view", { class: "tip-section" }, [
        vue.createElementVNode("text", { class: "tip-title" }, "打赏司机（选填）"),
        vue.createElementVNode("view", { class: "tip-options" }, [
          (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.tipOptions, (option) => {
              return vue.createElementVNode("view", {
                key: option.amount,
                class: vue.normalizeClass(["tip-option", { active: $setup.selectedTip === option.amount }]),
                onClick: ($event) => $setup.selectTip(option.amount)
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "tip-emoji" },
                  vue.toDisplayString(option.emoji),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "tip-amount" },
                  "£" + vue.toDisplayString(option.amount),
                  1
                  /* TEXT */
                )
              ], 10, ["onClick"]);
            }),
            64
            /* STABLE_FRAGMENT */
          ))
        ])
      ]),
      vue.createCommentVNode(" 提交按钮 "),
      vue.createElementVNode(
        "button",
        {
          class: "submit-btn",
          onClick: $setup.submitRating
        },
        vue.toDisplayString($setup.selectedTip ? `⭐ 提交评价并打赏£${$setup.selectedTip}` : "⭐ 提交评价"),
        1
        /* TEXT */
      )
    ]);
  }
  const PagesA0201ClientRatingV01 = /* @__PURE__ */ _export_sfc(_sfc_main$j, [["render", _sfc_render$i], ["__scopeId", "data-v-c38286b8"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0201_client_rating_v01.vue"]]);
  const _sfc_main$i = {
    __name: "A0202_client_order_history_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const orders = vue.ref([
        {
          orderNumber: "CNB202405060001",
          orderTime: "2025-05-06 10:30",
          serviceType: "接机",
          amount: "88.00"
        },
        {
          orderNumber: "CNB202405050002",
          orderTime: "2025-05-05 14:00",
          serviceType: "送机",
          amount: "120.00"
        },
        {
          orderNumber: "CNB202405040003",
          orderTime: "2025-05-04 09:15",
          serviceType: "包车",
          amount: "200.00"
        }
      ]);
      function downloadReceipt(order) {
        uni.showToast({
          title: `收据下载中：${order.orderNumber}`,
          icon: "none"
        });
      }
      const __returned__ = { orders, downloadReceipt, ref: vue.ref };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$h(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "order-history-page" }, [
      vue.createElementVNode("view", { class: "title" }),
      vue.createElementVNode("scroll-view", {
        class: "order-list",
        "scroll-y": "true"
      }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.orders, (order, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "order-item",
              key: index
            }, [
              vue.createElementVNode("view", { class: "row" }, [
                vue.createElementVNode("text", { class: "label" }, "订单编号："),
                vue.createElementVNode(
                  "text",
                  { class: "value" },
                  vue.toDisplayString(order.orderNumber),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "row" }, [
                vue.createElementVNode("text", { class: "label" }, "下单时间："),
                vue.createElementVNode(
                  "text",
                  { class: "value" },
                  vue.toDisplayString(order.orderTime),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "row" }, [
                vue.createElementVNode("text", { class: "label" }, "服务类型："),
                vue.createElementVNode(
                  "text",
                  { class: "value" },
                  vue.toDisplayString(order.serviceType),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "row" }, [
                vue.createElementVNode("text", { class: "label" }, "金额："),
                vue.createElementVNode(
                  "text",
                  { class: "value" },
                  "£" + vue.toDisplayString(order.amount),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("button", {
                class: "receipt-button",
                onClick: ($event) => $setup.downloadReceipt(order)
              }, "🧾下载收据", 8, ["onClick"])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])
    ]);
  }
  const PagesA0202ClientOrderHistoryV01 = /* @__PURE__ */ _export_sfc(_sfc_main$i, [["render", _sfc_render$h], ["__scopeId", "data-v-f5ae6983"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0202_client_order_history_v01.vue"]]);
  const _sfc_main$h = {
    methods: {
      goOrderCenter() {
        uni.navigateTo({ url: "/pages/A0101_client_order_service_type_v01" });
      },
      goOrder() {
        uni.navigateTo({ url: "/pages/A0202_client_order_history_v01" });
      },
      goTrip() {
        uni.navigateTo({ url: "/pages/A0110_client_in_trip_v01" });
      },
      goService() {
        uni.navigateTo({ url: "/pages/A0312_client_payment_center_v01" });
      },
      goPoints() {
        uni.navigateTo({ url: "/pages/A0302_client_points_coupons_membership_center_v01" });
      },
      goActivity() {
        uni.navigateTo({ url: "/pages/A0304_client_events_center_v01" });
      },
      goSOS() {
        uni.navigateTo({ url: "/pages/A0305_client_sos_v01" });
      },
      goRating() {
        uni.navigateTo({ url: "/pages/A0201_client_rating_v01" });
      },
      goProfile() {
        uni.navigateTo({ url: "/pages/A0005_client_profile_detail_v01" });
      },
      goNotifications() {
        uni.navigateTo({ url: "/pages/A0502_client_notifications_v01" });
      },
      goHelp() {
        uni.navigateTo({ url: "/pages/A0403_client_help_center_v01" });
      },
      goLogout() {
        uni.navigateTo({ url: "/pages/A0009_client_logout_confirm_v01" });
      }
    }
  };
  function _sfc_render$g(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "main-container" }, [
      vue.createElementVNode("view", { class: "header" }),
      vue.createCommentVNode(" 广告位条 "),
      vue.createElementVNode("view", { class: "card ad-banner ad-slot" }, "广告位｜admin@cnber.vip"),
      vue.createCommentVNode(" 主功能区卡片 "),
      vue.createElementVNode("view", { class: "grid" }, [
        vue.createElementVNode("view", {
          class: "card grid-item red",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.goOrderCenter && $options.goOrderCenter(...args))
        }, "🛒 下单中心"),
        vue.createElementVNode("view", {
          class: "card grid-item peach",
          onClick: _cache[1] || (_cache[1] = (...args) => $options.goOrder && $options.goOrder(...args))
        }, "🧾 我的订单"),
        vue.createElementVNode("view", {
          class: "card grid-item mint",
          onClick: _cache[2] || (_cache[2] = (...args) => $options.goTrip && $options.goTrip(...args))
        }, "🙋‍♀️ 我的行程"),
        vue.createElementVNode("view", {
          class: "card grid-item lilac",
          onClick: _cache[3] || (_cache[3] = (...args) => $options.goSOS && $options.goSOS(...args))
        }, "🚨 SOS帮助"),
        vue.createElementVNode("view", {
          class: "card grid-item blush",
          onClick: _cache[4] || (_cache[4] = (...args) => $options.goService && $options.goService(...args))
        }, "💳 支付中心"),
        vue.createElementVNode("view", {
          class: "card grid-item gemstone",
          onClick: _cache[5] || (_cache[5] = (...args) => $options.goRating && $options.goRating(...args))
        }, "⭐ 订单评价"),
        vue.createElementVNode("view", {
          class: "card grid-item cream",
          onClick: _cache[6] || (_cache[6] = (...args) => $options.goPoints && $options.goPoints(...args))
        }, "🎁 会员中心"),
        vue.createElementVNode("view", {
          class: "card grid-item soft-purple",
          onClick: _cache[7] || (_cache[7] = (...args) => $options.goActivity && $options.goActivity(...args))
        }, "🍦 公益中心"),
        vue.createElementVNode("view", {
          class: "card grid-item baby-blue",
          onClick: _cache[8] || (_cache[8] = (...args) => $options.goProfile && $options.goProfile(...args))
        }, "👤 账户信息"),
        vue.createElementVNode("view", {
          class: "card grid-item mango",
          onClick: _cache[9] || (_cache[9] = (...args) => $options.goNotifications && $options.goNotifications(...args))
        }, "🔔 消息通知"),
        vue.createElementVNode("view", {
          class: "card grid-item sand",
          onClick: _cache[10] || (_cache[10] = (...args) => $options.goHelp && $options.goHelp(...args))
        }, "❓ 帮助中心"),
        vue.createElementVNode("view", {
          class: "card grid-item ash",
          onClick: _cache[11] || (_cache[11] = (...args) => $options.goLogout && $options.goLogout(...args))
        }, "🚪 退出登录")
      ]),
      vue.createCommentVNode(" 商务联系条 "),
      vue.createElementVNode("view", { class: "card ad-banner biz-contact" }, "商务合作｜admin@cnber.vip")
    ]);
  }
  const PagesA0300ClientMainV01 = /* @__PURE__ */ _export_sfc(_sfc_main$h, [["render", _sfc_render$g], ["__scopeId", "data-v-623d72a4"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0300_client_main_v01.vue"]]);
  const _sfc_main$g = {
    __name: "A0301_client_customer_service_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const input = vue.ref("");
      const messages = vue.ref([
        { from: "ai", text: "您好！我是客服“小赛”，请问有什么可以帮您？" }
      ]);
      const sendMessage = () => {
        if (!input.value.trim())
          return;
        messages.value.push({
          from: "user",
          text: input.value
        });
        input.value = "";
        setTimeout(() => {
          messages.value.push({
            from: "bot",
            text: "好的，我们将尽快为您处理~"
          });
        }, 800);
      };
      const goHome = () => {
        uni.redirectTo({ url: "/pages/A0300_client_main_v01" });
      };
      const __returned__ = { input, messages, sendMessage, goHome, ref: vue.ref, nextTick: vue.nextTick };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$f(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "header" }),
      vue.createElementVNode("scroll-view", {
        class: "chat-box",
        "scroll-y": "true"
      }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.messages, (msg, index) => {
            return vue.openBlock(), vue.createElementBlock(
              "view",
              {
                key: index,
                class: vue.normalizeClass(["message", msg.from])
              },
              [
                vue.createElementVNode("image", {
                  class: "avatar",
                  src: msg.from === "user" ? "/static/avatar_user.png" : "/static/avatar_ai.png"
                }, null, 8, ["src"]),
                vue.createElementVNode(
                  "view",
                  { class: "bubble" },
                  vue.toDisplayString(msg.text),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            );
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createElementVNode("view", { class: "input-box" }, [
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.input = $event),
            placeholder: "请输入您的问题...",
            class: "input"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.input]
        ]),
        vue.createElementVNode("button", {
          class: "send-btn",
          onClick: $setup.sendMessage
        }, "发送")
      ]),
      vue.createElementVNode("view", { class: "bottom-note" }, "感谢您对中步出行平台的支持，祝您英国生活愉快！")
    ]);
  }
  const PagesA0301ClientCustomerServiceV01 = /* @__PURE__ */ _export_sfc(_sfc_main$g, [["render", _sfc_render$f], ["__scopeId", "data-v-f3903aca"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0301_client_customer_service_v01.vue"]]);
  const _sfc_main$f = {
    data() {
      return {
        tabs: ["积分中心", "优惠券中心", "会员政策", "邀请码"],
        activeTab: 0,
        points: 250,
        pointsRecords: [
          { date: "2025-05-06", action: "乘车获得", amount: 20 },
          { date: "2025-05-03", action: "兑换优惠券", amount: -50 }
        ],
        coupons: [
          { amount: 10, desc: "满100减10元", expireDate: "2025-06-30" },
          { amount: 20, desc: "满200减20元", expireDate: "2025-07-15" }
        ],
        inviteCode: "XYSZ2025"
      };
    },
    methods: {
      copyCode() {
        uni.setClipboardData({
          data: this.inviteCode,
          success: () => {
            uni.showToast({
              title: "邀请码已复制",
              icon: "success"
            });
          }
        });
      },
      goHome() {
        uni.reLaunch({
          url: "/pages/A0300_client_main_v01"
        });
      }
    }
  };
  function _sfc_render$e(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "points-container" }, [
      vue.createCommentVNode(" 顶部 Tab 栏 "),
      vue.createElementVNode("view", { class: "tabs" }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.tabs, (tab, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              key: index,
              class: vue.normalizeClass(["tab-item", $data.activeTab === index ? "active" : ""]),
              onClick: ($event) => $data.activeTab = index
            }, vue.toDisplayString(tab), 11, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createCommentVNode(" 内容区 "),
      vue.createElementVNode("view", { class: "content" }, [
        vue.createElementVNode("view", { class: "content-box" }, [
          vue.createCommentVNode(" 积分中心 "),
          $data.activeTab === 0 ? (vue.openBlock(), vue.createElementBlock("view", { key: 0 }, [
            vue.createElementVNode("view", { class: "section" }, [
              vue.createElementVNode("text", { class: "section-title" }, "我的积分"),
              vue.createElementVNode("view", { class: "points-card" }, [
                vue.createElementVNode(
                  "text",
                  { class: "points" },
                  vue.toDisplayString($data.points) + " 分",
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "desc" }, "您当前的可用积分")
              ])
            ]),
            vue.createElementVNode("view", { class: "section" }, [
              vue.createElementVNode("text", { class: "section-title" }, "积分使用记录"),
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.pointsRecords, (record, index) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    class: "record-card",
                    key: index
                  }, [
                    vue.createElementVNode(
                      "text",
                      null,
                      vue.toDisplayString(record.date) + " - " + vue.toDisplayString(record.action) + " - " + vue.toDisplayString(record.amount) + "分",
                      1
                      /* TEXT */
                    )
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ])) : vue.createCommentVNode("v-if", true),
          vue.createCommentVNode(" 优惠券中心 "),
          $data.activeTab === 1 ? (vue.openBlock(), vue.createElementBlock("view", { key: 1 }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.coupons, (coupon, index) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: index,
                  class: "coupon-card"
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "coupon-left" },
                    vue.toDisplayString(coupon.amount) + "元",
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("view", { class: "coupon-right" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "coupon-desc" },
                      vue.toDisplayString(coupon.desc),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode(
                      "text",
                      { class: "coupon-expire" },
                      "有效期至 " + vue.toDisplayString(coupon.expireDate),
                      1
                      /* TEXT */
                    )
                  ])
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])) : vue.createCommentVNode("v-if", true),
          vue.createCommentVNode(" 会员政策 "),
          $data.activeTab === 2 ? (vue.openBlock(), vue.createElementBlock("view", { key: 2 }, [
            vue.createElementVNode("view", { class: "section" }, [
              vue.createElementVNode("text", { class: "section-title" }, "会员政策"),
              vue.createElementVNode("view", { class: "policy-card" }, [
                vue.createElementVNode("text", null, "1. 成为会员可享受专属优惠和优先派单。"),
                vue.createElementVNode("text", null, "2. 每年会员费用为365元。"),
                vue.createElementVNode("text", null, "3. 会员有效期内，积分获取速度提升20%。"),
                vue.createElementVNode("text", null, "4. 更多权益请联系客服咨询。")
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true),
          vue.createCommentVNode(" 邀请码 "),
          $data.activeTab === 3 ? (vue.openBlock(), vue.createElementBlock("view", { key: 3 }, [
            vue.createElementVNode("view", { class: "section" }, [
              vue.createElementVNode("text", { class: "section-title" }, "我的邀请码"),
              vue.createElementVNode("view", { class: "invite-card" }, [
                vue.createElementVNode(
                  "text",
                  { class: "invite-code" },
                  vue.toDisplayString($data.inviteCode),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("button", {
                  class: "copy-button",
                  onClick: _cache[0] || (_cache[0] = (...args) => $options.copyCode && $options.copyCode(...args))
                }, "复制邀请码"),
                vue.createElementVNode("text", { class: "invite-tip" }, "分享给好友注册，即可获得积分奖励！")
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      vue.createCommentVNode(" 积分说明区域 "),
      vue.createElementVNode("view", { class: "points-note" }, [
        vue.createElementVNode("text", { class: "note-title" }, "积分说明："),
        vue.createElementVNode("text", { class: "note-line" }, "1. 积分可用于兑换优惠券或参与活动；"),
        vue.createElementVNode("text", { class: "note-line" }, "2. 每消费1元积1分，特殊活动另行通知；"),
        vue.createElementVNode("text", { class: "note-line" }, "3. 兑换成功后不可退还，请谨慎操作。")
      ])
    ]);
  }
  const PagesA0302ClientPointsCouponsMembershipCenterV01 = /* @__PURE__ */ _export_sfc(_sfc_main$f, [["render", _sfc_render$e], ["__scopeId", "data-v-b5c8c138"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0302_client_points_coupons_membership_center_v01.vue"]]);
  const _sfc_main$e = {
    __name: "A0303_client_change_password_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const phone = vue.ref("");
      const code = vue.ref("");
      const newPassword = vue.ref("");
      const confirmPassword = vue.ref("");
      const countdown = vue.ref(0);
      const countryList = vue.ref([
        { code: "+86", zh: "中国" },
        { code: "+44", zh: "英国" },
        { code: "+852", zh: "香港" },
        { code: "+853", zh: "澳门" },
        { code: "+886", zh: "台湾" },
        { code: "+65", zh: "新加坡" },
        { code: "+60", zh: "马来西亚" },
        { code: "+66", zh: "泰国" }
      ]);
      const selectedCountry = vue.ref("");
      const setDefaultCountry = () => {
        selectedCountry.value = `${countryList.value[0].code} ${countryList.value[0].zh}`;
      };
      const selectCountry = (e) => {
        const item = countryList.value[e.detail.value];
        selectedCountry.value = `${item.code} ${item.zh}`;
      };
      const sendCode = () => {
        if (!phone.value) {
          uni.showToast({ title: "请输入手机号", icon: "none" });
          return;
        }
        if (countdown.value > 0)
          return;
        countdown.value = 60;
        const timer = setInterval(() => {
          countdown.value--;
          if (countdown.value <= 0)
            clearInterval(timer);
        }, 1e3);
      };
      const submit = () => {
        if (!phone.value || !code.value || !newPassword.value || !confirmPassword.value) {
          uni.showToast({ title: "请输入完整信息", icon: "none" });
          return;
        }
        if (newPassword.value !== confirmPassword.value) {
          uni.showToast({ title: "两次输入的密码不一致", icon: "none" });
          return;
        }
        uni.showToast({ title: "密码已重置", icon: "success" });
      };
      vue.onMounted(() => {
        setDefaultCountry();
      });
      const __returned__ = { phone, code, newPassword, confirmPassword, countdown, countryList, selectedCountry, setDefaultCountry, selectCountry, sendCode, submit, ref: vue.ref, onMounted: vue.onMounted };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$d(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("text", { class: "title" }, "更改密码")
      ]),
      vue.createCommentVNode(" 手机号输入 "),
      vue.createElementVNode("picker", {
        mode: "selector",
        range: $setup.countryList.map((c) => `${c.code} ${c.zh}`),
        onChange: $setup.selectCountry
      }, [
        vue.createElementVNode(
          "view",
          { class: "input" },
          vue.toDisplayString($setup.selectedCountry),
          1
          /* TEXT */
        )
      ], 40, ["range"]),
      vue.withDirectives(vue.createElementVNode(
        "input",
        {
          class: "input",
          type: "number",
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.phone = $event),
          placeholder: "请输入手机号"
        },
        null,
        512
        /* NEED_PATCH */
      ), [
        [vue.vModelText, $setup.phone]
      ]),
      vue.createCommentVNode(" 验证码输入 "),
      vue.createElementVNode("view", { class: "code-row" }, [
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input code-input",
            type: "number",
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.code = $event),
            placeholder: "请输入验证码"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.code]
        ]),
        vue.createElementVNode("button", {
          class: "code-btn",
          disabled: $setup.countdown > 0,
          onClick: $setup.sendCode
        }, vue.toDisplayString($setup.countdown > 0 ? `${$setup.countdown}s` : "获取验证码"), 9, ["disabled"])
      ]),
      vue.createCommentVNode(" 新密码 "),
      vue.withDirectives(vue.createElementVNode(
        "input",
        {
          class: "input",
          type: "password",
          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.newPassword = $event),
          placeholder: "请输入新密码"
        },
        null,
        512
        /* NEED_PATCH */
      ), [
        [vue.vModelText, $setup.newPassword]
      ]),
      vue.createCommentVNode(" 确认新密码 "),
      vue.withDirectives(vue.createElementVNode(
        "input",
        {
          class: "input",
          type: "password",
          "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.confirmPassword = $event),
          placeholder: "请再次输入新密码"
        },
        null,
        512
        /* NEED_PATCH */
      ), [
        [vue.vModelText, $setup.confirmPassword]
      ]),
      vue.createCommentVNode(" 提交按钮 "),
      vue.createElementVNode("button", {
        class: "submit-btn",
        onClick: $setup.submit
      }, "重置密码")
    ]);
  }
  const PagesA0303ClientChangePasswordV01 = /* @__PURE__ */ _export_sfc(_sfc_main$e, [["render", _sfc_render$d], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0303_client_change_password_v01.vue"]]);
  const _sfc_main$d = {
    data() {
      return {
        myDonation: {
          month: 12,
          total: 58,
          lastTime: "2025-05-06"
        },
        platformFund: {
          total: 10234,
          events: 3
        },
        activities: [
          {
            title: "爱心植树活动",
            status: "进行中",
            description: "我们已累计一万客户的公益基金，将在本月底启动公益植树行动。",
            image: "https://dummyimage.com/600x300/8fd3f4/ffffff&text=植树活动"
          },
          {
            title: "助力老人院",
            status: "已完成",
            description: "2025年3月，我们将筹得的5000元捐赠至本地老人院，感谢您的支持！",
            image: "https://dummyimage.com/600x300/ffd699/333333&text=老人院公益"
          }
        ]
      };
    },
    methods: {
      viewTransparency() {
        uni.showModal({
          title: "资金透明度",
          content: "这里展示平台的公益资金流向及明细。未来可跳转详情页。",
          showCancel: false
        });
      }
    }
  };
  function _sfc_render$c(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "donation-container" }, [
      vue.createCommentVNode(" 我的捐赠总览 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "我的捐赠总览"),
        vue.createElementVNode("view", { class: "my-donation-card" }, [
          vue.createElementVNode("view", { class: "row" }, [
            vue.createElementVNode("text", null, "本月累计捐赠："),
            vue.createElementVNode(
              "text",
              { class: "highlight" },
              vue.toDisplayString($data.myDonation.month) + " 元",
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "row" }, [
            vue.createElementVNode("text", null, "累计捐赠："),
            vue.createElementVNode(
              "text",
              { class: "highlight" },
              vue.toDisplayString($data.myDonation.total) + " 元",
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "row" }, [
            vue.createElementVNode("text", null, "最近一次捐赠时间："),
            vue.createElementVNode(
              "text",
              { class: "highlight" },
              vue.toDisplayString($data.myDonation.lastTime),
              1
              /* TEXT */
            )
          ])
        ])
      ]),
      vue.createCommentVNode(" 平台公益基金概况 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "平台公益基金"),
        vue.createElementVNode("view", { class: "fund-card" }, [
          vue.createElementVNode("view", { class: "row" }, [
            vue.createElementVNode("text", null, "平台累计金额："),
            vue.createElementVNode(
              "text",
              { class: "highlight" },
              vue.toDisplayString($data.platformFund.total) + " 元",
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "row" }, [
            vue.createElementVNode("text", null, "已发起公益次数："),
            vue.createElementVNode(
              "text",
              { class: "highlight" },
              vue.toDisplayString($data.platformFund.events) + " 次",
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "row" }, [
            vue.createElementVNode("text", null, "资金透明度："),
            vue.createElementVNode("text", {
              class: "highlight link",
              onClick: _cache[0] || (_cache[0] = (...args) => $options.viewTransparency && $options.viewTransparency(...args))
            }, "查看详情")
          ])
        ])
      ]),
      vue.createCommentVNode(" 公益活动专区 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "公益活动专区"),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.activities, (activity, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "activity-card",
              key: index
            }, [
              vue.createElementVNode("image", {
                src: activity.image,
                class: "activity-image"
              }, null, 8, ["src"]),
              vue.createElementVNode("view", { class: "activity-info" }, [
                vue.createElementVNode(
                  "text",
                  { class: "activity-title" },
                  vue.toDisplayString(activity.title),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "activity-status" },
                  vue.toDisplayString(activity.status),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "activity-desc" },
                  vue.toDisplayString(activity.description),
                  1
                  /* TEXT */
                )
              ])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])
    ]);
  }
  const PagesA0304ClientEventsCenterV01 = /* @__PURE__ */ _export_sfc(_sfc_main$d, [["render", _sfc_render$c], ["__scopeId", "data-v-bfbd0f60"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0304_client_events_center_v01.vue"]]);
  const _sfc_main$c = {
    __name: "A0305_client_sos_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const description = vue.ref("");
      const handleSOS = () => {
        uni.showToast({
          title: "SOS 已触发",
          icon: "none"
        });
      };
      const goHome = () => {
        uni.redirectTo({ url: "/pages/A0300_client_main_v01" });
      };
      const __returned__ = { description, handleSOS, goHome, ref: vue.ref };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$b(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "info-box" }, [
        vue.createElementVNode("text", { class: "item" }, [
          vue.createTextVNode("📞 通用紧急电话："),
          vue.createElementVNode("text", { class: "emph" }, "999"),
          vue.createTextVNode(" 或 "),
          vue.createElementVNode("text", { class: "emph" }, "112"),
          vue.createTextVNode("（警察、消防、急救）")
        ]),
        vue.createElementVNode("text", { class: "item" }, [
          vue.createTextVNode("📞 非紧急医疗："),
          vue.createElementVNode("text", { class: "emph" }, "111")
        ]),
        vue.createElementVNode("text", { class: "item" }, [
          vue.createTextVNode("📞 中国驻英使馆领保电话："),
          vue.createElementVNode("text", { class: "emph" }, "+44 (0)20 7631 1430")
        ])
      ]),
      vue.createElementVNode("view", { class: "input-area" })
    ]);
  }
  const PagesA0305ClientSosV01 = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["render", _sfc_render$b], ["__scopeId", "data-v-7a2c2f69"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0305_client_sos_v01.vue"]]);
  const _sfc_main$b = {
    __name: "A0306_client_privacy_policy_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      function handleConfirm() {
        uni.navigateBack({
          delta: 1
        });
      }
      const __returned__ = { handleConfirm };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$a(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page-container" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("text", { class: "title" }, "隐私政策")
      ]),
      vue.createElementVNode("scroll-view", {
        class: "content-box",
        "scroll-y": ""
      }, [
        vue.createElementVNode("text", { class: "content-text" }, " 《CNber 英国接送服务说明书》（客户使用） 尊敬的客户： 欢迎使用 CNber 英伦中文接送服务！为保障您的权益和行程安全，请仔细阅读以下服务说明： 一、服务定位 CNber 是一家位于中国注册的生活服务平台，主要面向在英华人群体及访英客户，提供“生活协助型接送服务”。 我们的服务并非传统网约车或出租车，而是： 一种预约制出行协助服务 服务内容包括行程规划、中文客服、路线调度与地接人员执行 二、服务包含内容 机场接送、城市间点对点出行、旅游包车、企业包车、校园接送等预约类接送服务； 中文客服全程跟进协调行程及变动； 安排已合作地接人员（含车辆）执行固定路线服务； 如需拼车，将在您同意情况下安排路线共享； 所有价格均为国内统一打包价格，不涉及当地现金交易。 三、付款说明 所有服务费用均由客户在中国 CNber 平台支付； 英国当地执行人员不会收取任何费用； 如遇司机私下要求付款，请第一时间联系 CNber 客服举报 四、风险说明 英国为左侧通行国家，部分路段无灯无护栏，请系好安全带； CNber 仅安排固定合作人员提供服务，不向客户推荐第三方车辆； 行程期间如有延误或不可抗力，请及时联系平台协助处理。 五、客户承诺 您确认： 所购买的服务属于“生活协助”性质，非打车/专车平台服务； 所有费用与司机无直接支付行为，避免私下交易； 遵守英国交通法律法规，文明乘车，尊重执行人员安排。 文件二：《司机非雇佣合作协议草案》 甲方：CNber 平台（中国境内运营主体） 乙方：司机（以下简称乙方） 鉴于： 甲方致力于为中国客户提供赴英期间的地面出行协助服务，乙方自愿参与 CNber 合作计划并承担部分接送服务任务，双方本着合法、平等、互利原则，达成如下协议： 一、合作性质 本协议为非雇佣合作协议，乙方为独立合作执行人； 乙方不隶属于 CNber 员工体系，亦不享有正式员工权利； 合作仅限于已预约订单，不可自行接单、调价、收款。 二、任务执行 所有任务由平台统一调度并派发； 乙方必须严格按指定时间、地点、线路执行服务，包括但不限于：机场接送、城市间点对点任务、全日包车、旅游包车、商务包车、校园接送等； 乙方需根据不同服务类型合理安排车辆整备与导航路线，不得以任何形式向乘客索要现金、收取费用或私自更改任务内容。 三、补贴与结算 乙方所得为“行程补贴”或“服务协助费”，由 CNber 中国平台统一结算； 补贴每单/每周结算一次，按实际执行情况发放； 平台有权因违约行为扣除全部或部分补贴。 四、责任与风险 乙方需自行承担其车辆的保险、燃油、保养等成本； 执行任务时，如有事故或投诉，乙方需及时报告并配合平台处理； 平台不承担乙方执行过程中的第三方责任。 五、其他 合同期为一年，可提前书面通知终止； 本协议未尽事宜，双方友好协商解决。 甲方代表签字：_______________ 日期：_________ 乙方签字：___________________ 日期：_________ 文件三：《中英平台服务结构合法性说明白皮书》 本文件用于说明 CNber 项目所采用的中英分层服务模式在法律结构上的合规性判断与风险控制措施。 一、平台结构 CNber 平台注册于中国境内，主营旅游/出行/生活服务； 所有客户付款、合同签署与售后均在中国完成； 英国当地无平台法人实体、无注册支付通道。 二、服务结构 CNber 为客户提供的是“预约生活协助型服务包”，涵盖路线协调、客服、出行安排； 英国司机为合作人员，接受平台任务派单，不收取客户任何费用； 所有收入为“补贴型费用”，不构成客户与司机的直接交易关系。 三、合规依据与风险隔离 不构成网约车经营行为：因无当地支付、无公开运营，无需 TFL 或 PHV 执照； 不构成劳动雇佣：司机签署《非雇佣合作协议》，无固定工资，无劳资纠纷风险； 规避税务风险：中国结算、境外服务，不涉及英国平台收入申报； 保险风险隔离：平台不作为出行服务商，仅为客户调度执行人员。 四、未来改进建议 可在英国设立 LLP 或服务中心，用于客户线下接待与安全联络； 所有执行人员建议投保“旅客接送责任险”或相关责任保险。 附录一：《英国司机注册公司合规指南》（简体中文版） 一、司机合规运营的三种主流路径 注册个体经营（Sole Trader） 注册有限公司（Limited Company, Ltd） 挂靠已有合法出租公司（如 Uber/Bolt/local minicab） 二、注册公司操作指南 官网：https://www.gov.uk/set-up-business 准备材料：护照/BRP、住址、水电账单、邮箱、NI号 注册周期：当日可完成注册，约£12费用 三、申请 Private Hire Licence 流程（以伦敦为例） 提交申请至 TFL 提供：背景调查（DBS）、医疗体检、英语与路线测试 注册 Private Hire Vehicle（PHV） 注册 Insurance：Hire and Reward Insurance 四、报税与发票 Sole Trader 每年需通过 HMRC 进行 Self Assessment 公司可使用平台标准合同发票结算 附录二：《CNber-UK 合作司机协议范本》（适用于与司机公司签约） 甲方：CNber 平台（中国运营实体） 乙方：________司机有限公司 / Sole Trader（以下简称乙方） 本协议规定双方在英国地区就地接用车项目合作事项，达成以下条款： 乙方为合法注册运营实体，并拥有必要执照提供交通服务； 甲方向乙方派发客户预约任务，乙方按要求提供车辆及司机执行服务； 所有客户费用已通过甲方结算，乙方不得向客户收取任何额外费用； 乙方应确保司机合法上岗、车辆合规、保险完备； 合同周期为12个月，可提前30日终止； 所有结算按月执行，乙方向甲方提供发票并收取约定服务费用。 附录三：《平台派单 + 司机公司接单流程结构图》 graph TD A[客户下单（CNber国内平台）] --> B[订单生成 + 客服确认] B --> C[平台调度系统派单] C --> D[英国注册司机公司接单] D --> E[公司分派司机执行任务] E --> F[司机服务 → 客户乘车 → 完成反馈] F --> G[平台回收反馈 + 月度对账] G --> H[司机公司统一开票 → 平台打款结算] CNber平台风控与法律团队 签署时间：_________ ")
      ]),
      vue.createElementVNode("view", { class: "confirm-button-wrapper" }, [
        vue.createElementVNode("button", {
          class: "confirm-button",
          onClick: $setup.handleConfirm
        }, "我已阅读并确认")
      ]),
      vue.createElementVNode("view", { class: "footer" }, "@2025 中步出行 版权所有")
    ]);
  }
  const PagesA0306ClientPrivacyPolicyV01 = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["render", _sfc_render$a], ["__scopeId", "data-v-44d4e9bd"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0306_client_privacy_policy_v01.vue"]]);
  const _sfc_main$a = {
    __name: "A0307_client_terms_of_service_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      function handleConfirm() {
        uni.navigateBack({
          delta: 1
        });
      }
      const __returned__ = { handleConfirm };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page-container" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("text", { class: "title" }, "服务协议")
      ]),
      vue.createElementVNode("scroll-view", {
        class: "content-box",
        "scroll-y": ""
      }, [
        vue.createElementVNode("text", { class: "content-text" }, " 《CNber 英国接送服务说明书》（客户使用） 尊敬的客户： 欢迎使用 CNber 英伦中文接送服务！为保障您的权益和行程安全，请仔细阅读以下服务说明： 一、服务定位 CNber 是一家位于中国注册的生活服务平台，主要面向在英华人群体及访英客户，提供“生活协助型接送服务”。 我们的服务并非传统网约车或出租车，而是： 一种预约制出行协助服务 服务内容包括行程规划、中文客服、路线调度与地接人员执行 二、服务包含内容 机场接送、城市间点对点出行、旅游包车、企业包车、校园接送等预约类接送服务； 中文客服全程跟进协调行程及变动； 安排已合作地接人员（含车辆）执行固定路线服务； 如需拼车，将在您同意情况下安排路线共享； 所有价格均为国内统一打包价格，不涉及当地现金交易。 三、付款说明 所有服务费用均由客户在中国 CNber 平台支付； 英国当地执行人员不会收取任何费用； 如遇司机私下要求付款，请第一时间联系 CNber 客服举报 四、风险说明 英国为左侧通行国家，部分路段无灯无护栏，请系好安全带； CNber 仅安排固定合作人员提供服务，不向客户推荐第三方车辆； 行程期间如有延误或不可抗力，请及时联系平台协助处理。 五、客户承诺 您确认： 所购买的服务属于“生活协助”性质，非打车/专车平台服务； 所有费用与司机无直接支付行为，避免私下交易； 遵守英国交通法律法规，文明乘车，尊重执行人员安排。 文件二：《司机非雇佣合作协议草案》 甲方：CNber 平台（中国境内运营主体） 乙方：司机（以下简称乙方） 鉴于： 甲方致力于为中国客户提供赴英期间的地面出行协助服务，乙方自愿参与 CNber 合作计划并承担部分接送服务任务，双方本着合法、平等、互利原则，达成如下协议： 一、合作性质 本协议为非雇佣合作协议，乙方为独立合作执行人； 乙方不隶属于 CNber 员工体系，亦不享有正式员工权利； 合作仅限于已预约订单，不可自行接单、调价、收款。 二、任务执行 所有任务由平台统一调度并派发； 乙方必须严格按指定时间、地点、线路执行服务，包括但不限于：机场接送、城市间点对点任务、全日包车、旅游包车、商务包车、校园接送等； 乙方需根据不同服务类型合理安排车辆整备与导航路线，不得以任何形式向乘客索要现金、收取费用或私自更改任务内容。 三、补贴与结算 乙方所得为“行程补贴”或“服务协助费”，由 CNber 中国平台统一结算； 补贴每单/每周结算一次，按实际执行情况发放； 平台有权因违约行为扣除全部或部分补贴。 四、责任与风险 乙方需自行承担其车辆的保险、燃油、保养等成本； 执行任务时，如有事故或投诉，乙方需及时报告并配合平台处理； 平台不承担乙方执行过程中的第三方责任。 五、其他 合同期为一年，可提前书面通知终止； 本协议未尽事宜，双方友好协商解决。 甲方代表签字：_______________ 日期：_________ 乙方签字：___________________ 日期：_________ 文件三：《中英平台服务结构合法性说明白皮书》 本文件用于说明 CNber 项目所采用的中英分层服务模式在法律结构上的合规性判断与风险控制措施。 一、平台结构 CNber 平台注册于中国境内，主营旅游/出行/生活服务； 所有客户付款、合同签署与售后均在中国完成； 英国当地无平台法人实体、无注册支付通道。 二、服务结构 CNber 为客户提供的是“预约生活协助型服务包”，涵盖路线协调、客服、出行安排； 英国司机为合作人员，接受平台任务派单，不收取客户任何费用； 所有收入为“补贴型费用”，不构成客户与司机的直接交易关系。 三、合规依据与风险隔离 不构成网约车经营行为：因无当地支付、无公开运营，无需 TFL 或 PHV 执照； 不构成劳动雇佣：司机签署《非雇佣合作协议》，无固定工资，无劳资纠纷风险； 规避税务风险：中国结算、境外服务，不涉及英国平台收入申报； 保险风险隔离：平台不作为出行服务商，仅为客户调度执行人员。 四、未来改进建议 可在英国设立 LLP 或服务中心，用于客户线下接待与安全联络； 所有执行人员建议投保“旅客接送责任险”或相关责任保险。 附录一：《英国司机注册公司合规指南》（简体中文版） 一、司机合规运营的三种主流路径 注册个体经营（Sole Trader） 注册有限公司（Limited Company, Ltd） 挂靠已有合法出租公司（如 Uber/Bolt/local minicab） 二、注册公司操作指南 官网：https://www.gov.uk/set-up-business 准备材料：护照/BRP、住址、水电账单、邮箱、NI号 注册周期：当日可完成注册，约£12费用 三、申请 Private Hire Licence 流程（以伦敦为例） 提交申请至 TFL 提供：背景调查（DBS）、医疗体检、英语与路线测试 注册 Private Hire Vehicle（PHV） 注册 Insurance：Hire and Reward Insurance 四、报税与发票 Sole Trader 每年需通过 HMRC 进行 Self Assessment 公司可使用平台标准合同发票结算 附录二：《CNber-UK 合作司机协议范本》（适用于与司机公司签约） 甲方：CNber 平台（中国运营实体） 乙方：________司机有限公司 / Sole Trader（以下简称乙方） 本协议规定双方在英国地区就地接用车项目合作事项，达成以下条款： 乙方为合法注册运营实体，并拥有必要执照提供交通服务； 甲方向乙方派发客户预约任务，乙方按要求提供车辆及司机执行服务； 所有客户费用已通过甲方结算，乙方不得向客户收取任何额外费用； 乙方应确保司机合法上岗、车辆合规、保险完备； 合同周期为12个月，可提前30日终止； 所有结算按月执行，乙方向甲方提供发票并收取约定服务费用。 附录三：《平台派单 + 司机公司接单流程结构图》 graph TD A[客户下单（CNber国内平台）] --> B[订单生成 + 客服确认] B --> C[平台调度系统派单] C --> D[英国注册司机公司接单] D --> E[公司分派司机执行任务] E --> F[司机服务 → 客户乘车 → 完成反馈] F --> G[平台回收反馈 + 月度对账] G --> H[司机公司统一开票 → 平台打款结算] CNber平台风控与法律团队 签署时间：_________ ")
      ]),
      vue.createElementVNode("view", { class: "confirm-button-wrapper" }, [
        vue.createElementVNode("button", {
          class: "confirm-button",
          onClick: $setup.handleConfirm
        }, "我已阅读并确认")
      ]),
      vue.createElementVNode("view", { class: "footer" }, "@2025 中步出行 版权所有")
    ]);
  }
  const PagesA0307ClientTermsOfServiceV01 = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["render", _sfc_render$9], ["__scopeId", "data-v-79fe31d0"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0307_client_terms_of_service_v01.vue"]]);
  const _sfc_main$9 = {
    __name: "A0312_client_payment_center_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const payments = vue.ref([
        { date: "2025-05-05", amount: 58, status: "已支付" },
        { date: "2025-05-07", amount: 42, status: "待支付" },
        { date: "2025-05-01", amount: 100, status: "已超时" },
        { date: "2025-04-29", amount: 88, status: "已支付" }
      ]);
      const statusTabs = ["全部", "已支付", "待支付", "已超时"];
      const currentTab = vue.ref("全部");
      const filteredPayments = vue.computed(() => {
        if (currentTab.value === "全部")
          return payments.value;
        return payments.value.filter((p) => p.status === currentTab.value);
      });
      const statusClass = (status) => {
        if (status === "已支付")
          return "status-paid";
        if (status === "待支付")
          return "status-pending";
        if (status === "已超时")
          return "status-expired";
        return "";
      };
      const methods = vue.ref([
        { name: "微信支付", icon: "/static/icons/wechat.png", active: true },
        { name: "支付宝支付", icon: "/static/icons/alipay.png", active: false }
      ]);
      const toggleMethod = (index) => {
        methods.value[index].active = !methods.value[index].active;
        uni.showToast({ title: methods.value[index].active ? "启用成功" : "已关闭", icon: "success" });
      };
      const __returned__ = { payments, statusTabs, currentTab, filteredPayments, statusClass, methods, toggleMethod, ref: vue.ref, computed: vue.computed };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "payment-center" }, [
      vue.createElementVNode("view", { class: "header" }),
      vue.createCommentVNode(" 状态筛选 "),
      vue.createElementVNode("view", { class: "tab-group" }, [
        (vue.openBlock(), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.statusTabs, (item, idx) => {
            return vue.createElementVNode("view", {
              key: idx,
              class: vue.normalizeClass(["tab-item", $setup.currentTab === item ? "active" : ""]),
              onClick: ($event) => $setup.currentTab = item
            }, vue.toDisplayString(item), 11, ["onClick"]);
          }),
          64
          /* STABLE_FRAGMENT */
        ))
      ]),
      vue.createCommentVNode(" 最近支付记录 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "支付记录"),
        $setup.filteredPayments.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", { key: 0 }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.filteredPayments, (item, index) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: index,
                class: "record-item"
              }, [
                vue.createElementVNode(
                  "text",
                  null,
                  vue.toDisplayString(item.date) + " - ¥" + vue.toDisplayString(item.amount),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  {
                    class: vue.normalizeClass(["status", $setup.statusClass(item.status)])
                  },
                  vue.toDisplayString(item.status),
                  3
                  /* TEXT, CLASS */
                )
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "no-data"
        }, "暂无此类订单"))
      ]),
      vue.createCommentVNode(" 支付方式管理 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "支付方式"),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.methods, (method, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "payment-item",
              key: index
            }, [
              vue.createElementVNode("image", {
                src: method.icon,
                class: "icon"
              }, null, 8, ["src"]),
              vue.createElementVNode(
                "view",
                { class: "text" },
                vue.toDisplayString(method.name),
                1
                /* TEXT */
              ),
              vue.createElementVNode("switch", {
                checked: method.active,
                onChange: ($event) => $setup.toggleMethod(index)
              }, null, 40, ["checked", "onChange"])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])
    ]);
  }
  const PagesA0312ClientPaymentCenterV01 = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$8], ["__scopeId", "data-v-3f5d8fe2"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0312_client_payment_center_v01.vue"]]);
  const _sfc_main$8 = {
    __name: "A0403_client_help_center_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const faqList = vue.ref([
        { title: "如何注册？", page: "/pages/A0405_client_help_register_v01" },
        { title: "如何登录？", page: "/pages/A0406_client_help_login_v01" },
        { title: "如何使用各项服务？", page: "/pages/A0407_client_help_usage_v01" },
        { title: "联系客服通道", page: "/pages/A0301_client_customer_service_v01" }
      ]);
      const goToFaq = (item) => {
        uni.navigateTo({
          url: item.page
        });
      };
      const goHome = () => {
        uni.redirectTo({
          url: "/pages/A0300_client_main_v01"
        });
      };
      const __returned__ = { faqList, goToFaq, goHome, ref: vue.ref };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$7(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "header" }),
      vue.createElementVNode("view", { class: "faq-list" }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.faqList, (item, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "faq-item",
              key: index,
              onClick: ($event) => $setup.goToFaq(item)
            }, " 📌 " + vue.toDisplayString(item.title), 9, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])
    ]);
  }
  const PagesA0403ClientHelpCenterV01 = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$7], ["__scopeId", "data-v-e42abba7"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0403_client_help_center_v01.vue"]]);
  const _sfc_main$7 = {
    __name: "A0404_client_404_not_found_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const __returned__ = {};
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page-container" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("text", { class: "title" }, "隐私政策")
      ]),
      vue.createElementVNode("scroll-view", {
        class: "content-box",
        "scroll-y": ""
      }, [
        vue.createElementVNode("text", { class: "content-text" }, " 这里是隐私政策的详细内容...（可替换为实际文本）这里是隐私政策的详细内容...这里是隐私政策的详细内容...这里是隐私政策的详细内容...这里是隐私政策的详细内容...这里是隐私政策的详细内容... ")
      ])
    ]);
  }
  const PagesA0404Client404NotFoundV01 = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__scopeId", "data-v-923e8e82"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0404_client_404_not_found_v01.vue"]]);
  const _sfc_main$6 = {
    __name: "A0405_client_help_register_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const goBack = () => {
        uni.navigateBack();
      };
      const __returned__ = { goBack };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "title" }),
      vue.createElementVNode("view", { class: "content" }, [
        vue.createElementVNode("text", null, "1️⃣ 打开应用后点击“注册”按钮。"),
        vue.createElementVNode("text", null, "2️⃣ 填写手机号、验证码和密码。"),
        vue.createElementVNode("text", null, "3️⃣ 点击确认注册，即可进入首页。")
      ])
    ]);
  }
  const PagesA0405ClientHelpRegisterV01 = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__scopeId", "data-v-4a90eedc"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0405_client_help_register_v01.vue"]]);
  const _sfc_main$5 = {
    __name: "A0406_client_help_login_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const goBack = () => {
        uni.navigateBack();
      };
      const __returned__ = { goBack };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "title" }),
      vue.createElementVNode("view", { class: "content" }, [
        vue.createElementVNode("text", null, "1️⃣ 打开应用后点击“注册”按钮。"),
        vue.createElementVNode("text", null, "2️⃣ 填写手机号、验证码和密码。"),
        vue.createElementVNode("text", null, "3️⃣ 点击确认注册，即可进入首页。")
      ])
    ]);
  }
  const PagesA0406ClientHelpLoginV01 = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__scopeId", "data-v-ac5ba6de"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0406_client_help_login_v01.vue"]]);
  const _sfc_main$4 = {
    __name: "A0407_client_help_usage_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const goBack = () => {
        uni.navigateBack();
      };
      const __returned__ = { goBack };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "title" }),
      vue.createElementVNode("view", { class: "content" }, [
        vue.createElementVNode("text", null, "1️⃣ 打开应用后点击“注册”按钮。"),
        vue.createElementVNode("text", null, "2️⃣ 填写手机号、验证码和密码。"),
        vue.createElementVNode("text", null, "3️⃣ 点击确认注册，即可进入首页。")
      ])
    ]);
  }
  const PagesA0407ClientHelpUsageV01 = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__scopeId", "data-v-44c250b3"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0407_client_help_usage_v01.vue"]]);
  const _sfc_main$3 = {
    __name: "A0502_client_notifications_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const notices = vue.ref([
        { title: "欢迎使用 CNber 出行服务！", time: "2025-05-11 13:00" },
        { title: "本月订单已结算，感谢您的支持。", time: "2025-05-10 09:30" }
      ]);
      const goHome = () => {
        uni.redirectTo({ url: "/pages/A0300_client_main_v01" });
      };
      const __returned__ = { notices, goHome, ref: vue.ref };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "header" }, "消息通知"),
      vue.createCommentVNode(" 通知列表 "),
      (vue.openBlock(true), vue.createElementBlock(
        vue.Fragment,
        null,
        vue.renderList($setup.notices, (notice, index) => {
          return vue.openBlock(), vue.createElementBlock("view", {
            key: index,
            class: "card"
          }, [
            vue.createElementVNode(
              "text",
              { class: "notice-title" },
              vue.toDisplayString(notice.title),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "notice-time" },
              vue.toDisplayString(notice.time),
              1
              /* TEXT */
            )
          ]);
        }),
        128
        /* KEYED_FRAGMENT */
      ))
    ]);
  }
  const PagesA0502ClientNotificationsV01 = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-71a5ba52"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0502_client_notifications_v01.vue"]]);
  const _imports_0 = "/static/icons/loading.gif";
  const _sfc_main$2 = {
    __name: "ClientLoading",
    props: {
      show: Boolean,
      message: {
        type: String,
        default: "加载中..."
      }
    },
    setup(__props, { expose: __expose }) {
      __expose();
      const props = __props;
      const visible = vue.ref(props.show);
      const message = vue.ref(props.message);
      const iconLoaded = vue.ref(false);
      const handleImageError = () => {
        iconLoaded.value = false;
        formatAppLog("log", "at components/ClientLoading.vue:37", "图片加载失败");
      };
      const handleImageLoad = () => {
        iconLoaded.value = true;
        formatAppLog("log", "at components/ClientLoading.vue:42", "图片加载成功");
      };
      vue.watch(() => props.show, (val) => {
        visible.value = val;
      });
      vue.watch(() => props.message, (val) => {
        message.value = val;
      });
      const __returned__ = { props, visible, message, iconLoaded, handleImageError, handleImageLoad, ref: vue.ref, watch: vue.watch };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return $setup.visible ? (vue.openBlock(), vue.createElementBlock("view", {
      key: 0,
      class: "loading-overlay"
    }, [
      vue.createElementVNode("view", { class: "loading-box" }, [
        !$setup.iconLoaded ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "loading-spinner"
        }, [
          vue.createElementVNode("view", { class: "spinner" })
        ])) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode(
          "image",
          {
            src: _imports_0,
            class: "loading-icon",
            mode: "aspectFit",
            onError: $setup.handleImageError,
            onLoad: $setup.handleImageLoad
          },
          null,
          32
          /* NEED_HYDRATION */
        ),
        vue.createElementVNode(
          "text",
          { class: "loading-text" },
          vue.toDisplayString($setup.message),
          1
          /* TEXT */
        )
      ])
    ])) : vue.createCommentVNode("v-if", true);
  }
  const ClientLoading = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-ee8e7d2d"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/components/ClientLoading.vue"]]);
  const _sfc_main$1 = {
    __name: "A0604_client_loading_v01",
    setup(__props, { expose: __expose }) {
      __expose();
      const __returned__ = { ClientLoading };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createVNode($setup["ClientLoading"], {
        show: true,
        message: "页面加载中..."
      })
    ]);
  }
  const PagesA0604ClientLoadingV01 = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-7065f17d"], ["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/pages/A0604_client_loading_v01.vue"]]);
  __definePage("pages/A0001_client_welcome_v01", PagesA0001ClientWelcomeV01);
  __definePage("pages/A0002_client_login_v01", PagesA0002ClientLoginV01);
  __definePage("pages/A0003_client_register_v01", PagesA0003ClientRegisterV01);
  __definePage("pages/A0005_client_profile_detail_v01", PagesA0005ClientProfileDetailV01);
  __definePage("pages/A0006_client_profile_complete_v01", PagesA0006ClientProfileCompleteV01);
  __definePage("pages/A0009_client_logout_confirm_v01", PagesA0009ClientLogoutConfirmV01);
  __definePage("pages/A0101_client_order_service_type_v01", PagesA0101ClientOrderServiceTypeV01);
  __definePage("pages/A0102_client_order_pickup_v01", PagesA0102ClientOrderPickupV01);
  __definePage("pages/A0103_client_order_dropoff_v01", PagesA0103ClientOrderDropoffV01);
  __definePage("pages/A0104_client_order_point_v01", PagesA0104ClientOrderPointV01);
  __definePage("pages/A0105_client_order_charter_v01", PagesA0105ClientOrderCharterV01);
  __definePage("pages/A0106_client_payment_v01", PagesA0106ClientPaymentV01);
  __definePage("pages/A0106a_client_payment_v01", PagesA0106aClientPaymentV01);
  __definePage("pages/A0107_client_wait_driver_v01", PagesA0107ClientWaitDriverV01);
  __definePage("pages/A0108_client_edit_order_v01", PagesA0108ClientEditOrderV01);
  __definePage("pages/A0109_client_driver_info_v01", PagesA0109ClientDriverInfoV01);
  __definePage("pages/A0110_client_in_trip_v01", PagesA0110ClientInTripV01);
  __definePage("pages/A0111_client_trip_completed_v01", PagesA0111ClientTripCompletedV01);
  __definePage("pages/A0201_client_rating_v01", PagesA0201ClientRatingV01);
  __definePage("pages/A0202_client_order_history_v01", PagesA0202ClientOrderHistoryV01);
  __definePage("pages/A0300_client_main_v01", PagesA0300ClientMainV01);
  __definePage("pages/A0301_client_customer_service_v01", PagesA0301ClientCustomerServiceV01);
  __definePage("pages/A0302_client_points_coupons_membership_center_v01", PagesA0302ClientPointsCouponsMembershipCenterV01);
  __definePage("pages/A0303_client_change_password_v01", PagesA0303ClientChangePasswordV01);
  __definePage("pages/A0304_client_events_center_v01", PagesA0304ClientEventsCenterV01);
  __definePage("pages/A0305_client_sos_v01", PagesA0305ClientSosV01);
  __definePage("pages/A0306_client_privacy_policy_v01", PagesA0306ClientPrivacyPolicyV01);
  __definePage("pages/A0307_client_terms_of_service_v01", PagesA0307ClientTermsOfServiceV01);
  __definePage("pages/A0312_client_payment_center_v01", PagesA0312ClientPaymentCenterV01);
  __definePage("pages/A0403_client_help_center_v01", PagesA0403ClientHelpCenterV01);
  __definePage("pages/A0404_client_404_not_found_v01", PagesA0404Client404NotFoundV01);
  __definePage("pages/A0405_client_help_register_v01", PagesA0405ClientHelpRegisterV01);
  __definePage("pages/A0406_client_help_login_v01", PagesA0406ClientHelpLoginV01);
  __definePage("pages/A0407_client_help_usage_v01", PagesA0407ClientHelpUsageV01);
  __definePage("pages/A0502_client_notifications_v01", PagesA0502ClientNotificationsV01);
  __definePage("pages/A0604_client_loading_v01", PagesA0604ClientLoadingV01);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:7", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:10", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "C:/Users/shuang/Documents/HBuilderProjects/CNber_client_admin_v1.0/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
