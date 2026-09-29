window.__ModuleLoader__.load({
  id: "dsh-kimi-code-oauth",
  factory: (require) => {
    const react = require("react");
    const NS = "dsh-kimi-code-oauth";
    const zh = {
      nav: "Kimi Code",
      title: "Kimi Code 订阅",
      description: "使用 Kimi Code 订阅登录，不需要粘贴 API Key。",
      route: "模型路由：kimi-code-oauth",
      auth: "设备码登录：dsh-kimi-code login"
    };
    const en = {
      nav: "Kimi Code",
      title: "Kimi Code subscription",
      description: "Sign in with a Kimi Code subscription without pasting an API key.",
      route: "Model route: kimi-code-oauth",
      auth: "Device login: dsh-kimi-code login"
    };
    function browserDict() {
      return typeof navigator !== "undefined" && String(navigator.language || "").toLowerCase().startsWith("zh") ? zh : en;
    }
    function css() {
      if (document.getElementById("dsh-kimi-code-oauth-style")) return;
      const style = document.createElement("style");
      style.id = "dsh-kimi-code-oauth-style";
      style.textContent = ".dsh-kimi-code-oauth-card{color:var(--dsw-alias-label-primary,#1f2328);background:var(--dsw-alias-bg-layer-2,#fff);border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:8px;padding:12px 14px;line-height:1.5}.dsh-kimi-code-oauth-card strong{display:block;margin-bottom:4px}.dsh-kimi-code-oauth-card small{display:block;color:var(--dsw-alias-label-tertiary,#8b93a1);margin-top:4px}";
      document.head.appendChild(style);
    }
    function apply(ctx) {
      css();
      const locale = ctx.get("locale");
      let t = (key) => browserDict()[key];
      if (locale) {
        ctx.effect(() => locale.register(NS, { zh, en }), "dsh-kimi-code-oauth: locale");
        t = locale.bind(NS);
      }
      const slots = ctx.get("slots");
      if (!slots) return;
      slots.inject("settings.models.item", () => slots.register({
        name: "settings.models.item",
        id: "dsh-kimi-code-oauth-info",
        order: 35,
        locale: NS,
        label: () => t("nav")
      }, () => react.createElement("div", { className: "dsh-kimi-code-oauth-card" },
        react.createElement("strong", null, t("title")),
        react.createElement("span", null, t("description")),
        react.createElement("small", null, t("route")),
        react.createElement("small", null, t("auth"))
      )));
    }
    return { name: "dsh-kimi-code-oauth", inject: ["slots", "locale"], apply };
  }
});
