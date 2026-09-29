window.__ModuleLoader__.load({
  id: "dsh-kimi-code-oauth",
  factory: (require) => {
    const React = require("react");
    const NS = "dsh-kimi-code-oauth";
    const zh = {
      nav: "Kimi Code",
      title: "Kimi Code 订阅",
      description: "使用 Kimi Code 订阅登录，无需粘贴 API Key。",
      login: "登录 Kimi Code",
      logout: "退出登录",
      cancel: "取消登录",
      signedIn: "已登录",
      signedOut: "未登录",
      open: "打开授权页",
      code: "设备码",
      refresh: "刷新",
      error: "登录失败",
      models: "模型",
      save: "保存模型",
      quota: "用量进度",
      quotaLoading: "正在读取额度…",
      quotaError: "无法读取额度",
      noQuota: "当前账户没有返回可显示的额度窗口。",
      plan: "套餐",
      parallel: "并发上限",
      resets: "{value} 后重置",
      w5h: "5 小时用量",
      w7d: "7 天用量",
      w1d: "每日用量",
      used: "{value}% 已用"
    };
    const en = {
      nav: "Kimi Code",
      title: "Kimi Code subscription",
      description: "Sign in with your Kimi Code subscription. No API key needed.",
      login: "Sign in to Kimi Code",
      logout: "Sign out",
      cancel: "Cancel sign-in",
      signedIn: "Signed in",
      signedOut: "Signed out",
      open: "Open authorization page",
      code: "Device code",
      refresh: "Refresh",
      error: "Sign-in failed",
      models: "Models",
      save: "Save models",
      quota: "Usage",
      quotaLoading: "Reading quota…",
      quotaError: "Could not read quota",
      noQuota: "This account returned no displayable quota windows.",
      plan: "Plan",
      parallel: "Parallel limit",
      resets: "Resets {value}",
      w5h: "5-hour usage",
      w7d: "7-day usage",
      w1d: "Daily usage",
      used: "{value}% used"
    };
    const paths = {
      status: "/plugins/dsh-kimi-code/oauth/status",
      usage: "/plugins/dsh-kimi-code/oauth/usage",
      login: "/plugins/dsh-kimi-code/oauth/login",
      cancel: "/plugins/dsh-kimi-code/oauth/login-cancel",
      logout: "/plugins/dsh-kimi-code/oauth/logout",
      models: "/plugins/dsh-kimi-code/oauth/models"
    };

    async function api(path, options = {}) {
      const response = await fetch(path, {
        ...options,
        headers: { "content-type": "application/json", ...(options.headers || {}) }
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || response.statusText);
      return value;
    }

    function css() {
      if (document.getElementById("dsh-kimi-code-oauth-style")) return;
      const style = document.createElement("style");
      style.id = "dsh-kimi-code-oauth-style";
      style.textContent = [
        ".dsh-kimi-page{color:var(--dsw-alias-label-primary,#1f2328);background:var(--dsw-alias-bg-layer-2,#fff);padding:16px;border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:8px;display:flex;flex-direction:column;gap:12px}",
        ".dsh-kimi-page small{color:var(--dsw-alias-label-tertiary,#8b93a1)}",
        ".dsh-kimi-page button{width:max-content;color:var(--dsw-alias-label-primary,#1f2328);background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,#d1d5db);border-radius:6px;padding:7px 12px;cursor:pointer}",
        ".dsh-kimi-code{font:600 20px monospace;letter-spacing:2px;padding:8px;background:var(--dsw-alias-bg-layer-3,#f3f4f6);width:max-content}",
        ".dsh-kimi-quota{border-top:1px solid var(--dsw-alias-border-l2,#e5e7eb);padding-top:12px;display:flex;flex-direction:column;gap:4px}",
        ".dsh-kimi-row{display:flex;flex-direction:column;gap:6px;margin:10px 0}",
        ".dsh-kimi-row-head{display:flex;justify-content:space-between;gap:8px;align-items:baseline}",
        ".dsh-kimi-row progress{width:100%;height:8px;accent-color:var(--dsw-alias-brand-primary,#4f6ef7)}"
      ].join("");
      document.head.appendChild(style);
    }

    function windowLabel(t, window) {
      const key = typeof window?.key === "string" ? window.key : "";
      if (key === "") return "";
      const known = t(key);
      return known === key ? key : known;
    }

    function resetText(t, resetAt) {
      if (typeof resetAt !== "string" || resetAt.length === 0) return undefined;
      const parsed = Date.parse(resetAt);
      if (!Number.isFinite(parsed)) return undefined;
      return t("resets", { value: new Date(parsed).toLocaleString() });
    }

    function Settings({ t }) {
      const [state, setState] = React.useState();
      const [usage, setUsage] = React.useState();
      const [busy, setBusy] = React.useState(false);
      const [selected, setSelected] = React.useState([]);

      const refresh = () =>
        Promise.all([api(paths.status), api(paths.usage)])
          .then(([nextState, nextUsage]) => {
            setState(nextState);
            setUsage(nextUsage);
            setSelected(nextState.selected || (nextState.models || []).map((model) => model.id));
          })
          .catch((error) => setState((current) => ({ ...current, error: error.message })));

      React.useEffect(() => {
        refresh();
        const id = setInterval(refresh, 10000);
        return () => clearInterval(id);
      }, []);

      const run = async (action) => {
        setBusy(true);
        try {
          await action();
          await refresh();
        } catch (error) {
          setState((current) => ({ ...current, error: error.message }));
        } finally {
          setBusy(false);
        }
      };

      const authenticated = state?.authenticated === true;
      const windows = usage?.windows || [];

      const quotaRows = windows.map((window) => {
        const reset = resetText(t, window.resetAt);
        return React.createElement(
          "div",
          { className: "dsh-kimi-row", key: window.key, "data-window": window.key },
          React.createElement(
            "div",
            { className: "dsh-kimi-row-head" },
            React.createElement("span", null, windowLabel(t, window)),
            React.createElement("strong", null, t("used", { value: String(Math.round(window.usedPercent * 100) / 100) }))
          ),
          React.createElement("progress", { max: 100, value: window.usedPercent }),
          reset ? React.createElement("small", null, reset) : null
        );
      });

      const quotaBody = usage?.error
        ? React.createElement("p", null, t("quotaError"))
        : usage === undefined
          ? React.createElement("p", null, t("quotaLoading"))
          : windows.length === 0
            ? React.createElement("p", null, t("noQuota"))
            : React.createElement(
                React.Fragment,
                null,
                usage.plan ? React.createElement("small", null, `${t("plan")}: ${usage.plan}`) : null,
                usage.parallelLimit ? React.createElement("small", null, `${t("parallel")}: ${usage.parallelLimit}`) : null,
                quotaRows
              );

      return React.createElement(
        "div",
        { className: "dsh-kimi-page" },
        React.createElement("strong", null, t("title")),
        React.createElement("span", null, t("description")),
        state?.error ? React.createElement("span", { role: "alert" }, `${t("error")}: ${state.error}`) : null,
        React.createElement("span", null, authenticated ? t("signedIn") : t("signedOut")),
        state?.challenge
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement("a", { href: state.challenge.url, target: "_blank", rel: "noreferrer" }, t("open")),
              state.challenge.userCode
                ? React.createElement(
                    React.Fragment,
                    null,
                    React.createElement("span", null, t("code")),
                    React.createElement("div", { className: "dsh-kimi-code" }, state.challenge.userCode)
                  )
                : null
            )
          : null,
        !authenticated && state?.signingIn !== true
          ? React.createElement(
              "button",
              { disabled: busy, onClick: () => run(() => api(paths.login, { method: "POST", body: "{}" })) },
              t("login")
            )
          : null,
        state?.signingIn === true
          ? React.createElement(
              "button",
              { disabled: busy, onClick: () => run(() => api(paths.cancel, { method: "POST", body: "{}" })) },
              t("cancel")
            )
          : null,
        authenticated
          ? React.createElement(
              "button",
              { disabled: busy, onClick: () => run(() => api(paths.logout, { method: "POST", body: "{}" })) },
              t("logout")
            )
          : null,
        authenticated
          ? React.createElement("div", { className: "dsh-kimi-quota" }, React.createElement("strong", null, t("quota")), quotaBody)
          : null,
        authenticated
          ? React.createElement(
              "fieldset",
              null,
              React.createElement("legend", null, t("models")),
              (state.models || []).map((model) =>
                React.createElement(
                  "label",
                  { key: model.id, style: { display: "block" } },
                  React.createElement("input", {
                    type: "checkbox",
                    checked: selected.includes(model.id),
                    onChange: (event) =>
                      setSelected((current) =>
                        event.target.checked ? [...current, model.id] : current.filter((id) => id !== model.id)
                      )
                  }),
                  model.name || model.id
                )
              ),
              React.createElement(
                "button",
                {
                  disabled: busy,
                  onClick: () =>
                    run(() =>
                      api(paths.models, {
                        method: "POST",
                        body: JSON.stringify({ selected, selectionMode: "selected" })
                      })
                    )
                },
                t("save")
              )
            )
          : null,
        React.createElement("button", { disabled: busy, onClick: refresh }, t("refresh"))
      );
    }

    function apply(ctx) {
      css();
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-kimi-code-oauth: dictionaries");
      const t = ctx.locale.bind(NS);
      ctx.slots.inject("settings.section", () =>
        ctx.slots.register(
          { name: "settings.section", id: NS, order: 45, label: () => t("nav"), locale: NS, inject: () => ({ t }) },
          () => React.createElement(Settings, { t })
        )
      );
    }

    return { name: "dsh-kimi-code-oauth", inject: ["slots", "locale", "theme"], apply };
  }
});
