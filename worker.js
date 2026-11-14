// 宝可梦免费账号聚合订阅 (Cloudflare Worker)
// 每个宝可梦账号每月 60GB 免费流量。本 Worker 把多个账号的订阅聚合成一个
// 地址：每次请求时，依次检查各账号的剩余流量（读订阅接口返回的
// Subscription-Userinfo 头），返回第一个还有流量的账号的节点列表。
// 账号用完/过期后自动跳过，下次请求会落到下一个还有流量的账号。
// 订阅 token 只存在 Worker 代码里，不会暴露给客户端。

// 10 个账号的订阅 token（注册完成后填入）。对应 aeimose+bkm1..bkm10@outlook.com。
var TOKENS = [
  "42ca31503d8ccdfd516a2e6c78518374",
];

// 订阅接口 host（主用 + 备用，两个共用同一 token）
var HOSTS = [
  "https://link123.52pokemon66.cc",
  "https://jkun.1qqdg.cn",
];

// 账号剩余流量低于该值即视为用完，跳过（500MB）
var MIN_REMAIN = 500 * 1024 * 1024;

// Showcase homepage HTML (injected at build time).
var SHOWCASE_HTML = __SHOWCASE_HTML__;

function parseUserinfo(h) {
  var o = {};
  if (!h) return o;
  var parts = h.split(";");
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    var idx = p.indexOf("=");
    if (idx > 0) {
      var k = p.slice(0, idx).trim();
      var v = Number(p.slice(idx + 1).trim());
      if (k && !isNaN(v)) o[k] = v;
    }
  }
  return o;
}

async function fetchSub(token) {
  var lastErr = null;
  for (var h = 0; h < HOSTS.length; h++) {
    var url = HOSTS[h] + "/api/v1/client/subscribe?token=" + token;
    try {
      var res = await fetch(url, {
        headers: { "User-Agent": "ClashMeta" },
      });
      if (res && res.ok) return res;
      lastErr = new Error("upstream status " + (res && res.status));
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("fetch failed");
}

async function handle(request) {
  var url = new URL(request.url);
  // Homepage: Muse showcase site.
  if (url.pathname === "/" || url.pathname === "") {
    return new Response(SHOWCASE_HTML, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
    });
  }


  // /status: 查看各账号剩余流量（调试用，不返回 token）
  if (url.pathname === "/status") {
    var rows = [];
    for (var i = 0; i < TOKENS.length; i++) {
      var row = { account: i + 1 };
      try {
        var r = await fetchSub(TOKENS[i]);
        var info = parseUserinfo(r.headers.get("Subscription-Userinfo"));
        var total = info.total || 0;
        var used = (info.upload || 0) + (info.download || 0);
        row.totalGB = total ? +(total / 1073741824).toFixed(2) : null;
        row.usedGB = total ? +(used / 1073741824).toFixed(2) : null;
        row.remainGB = total ? +((total - used) / 1073741824).toFixed(2) : null;
        row.expire = info.expire
          ? new Date(info.expire * 1000).toISOString().slice(0, 10)
          : null;
        row.ok = true;
        // 读掉 body，避免连接悬着
        await r.text();
      } catch (e) {
        row.ok = false;
        row.error = String(e && e.message || e);
      }
      rows.push(row);
    }
    return new Response(JSON.stringify({ accounts: rows }, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  // 订阅请求：随机起点，依次找一个还有流量的账号，返回它的节点列表
  var start = Math.floor(Math.random() * TOKENS.length);
  var nowSec = Math.floor(Date.now() / 1000);
  for (var k = 0; k < TOKENS.length; k++) {
    var token = TOKENS[(start + k) % TOKENS.length];
    var res;
    try {
      res = await fetchSub(token);
    } catch (e) {
      continue;
    }
    if (!res || !res.ok) continue;
    var info = parseUserinfo(res.headers.get("Subscription-Userinfo"));
    var total = info.total || 0;
    if (total > 0) {
      var used = (info.upload || 0) + (info.download || 0);
      var remain = total - used;
      var expired = info.expire && info.expire < nowSec;
      if (expired || remain <= MIN_REMAIN) {
        // 该账号已过期或流量用完，换下一个
        try { await res.text(); } catch (e) {}
        continue;
      }
    }
    // 该账号可用（或读不到流量信息时默认可用），返回它的节点列表
    var body = await res.text();
    if (!body || !body.trim()) continue;
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Subscription-Userinfo":
          res.headers.get("Subscription-Userinfo") || "",
        "Cache-Control": "no-cache",
      },
    });
  }
  return new Response("all accounts out of traffic", { status: 503 });
}

addEventListener("fetch", function (event) {
  event.respondWith(handle(event.request));
});
