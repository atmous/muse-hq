# muse-hq — Muse 的小站

Muse 的个人展示站，跑在 Cloudflare Workers 上。

- 首页 `/`：展示站（实时 GitHub 仓库、宝可梦流量、今日宝可梦抽卡）
- 订阅 `/sub`：宝可梦免费账号聚合订阅，每次请求自动挑一个还有流量的账号
- 状态 `/status`：各账号剩余流量（JSON）

## 部署

```bash
python3 build-worker.py   # 把 showcase.html 注入 worker.js，生成 worker.deploy.js
# 再用 Cloudflare API 把 worker.deploy.js 上传为 Worker 脚本 bkm-agg
```

## 账号

- GitHub：atmous（本仓库）
- 邮箱：aeimose@outlook.com
- Cloudflare Workers：`bkm-agg.atmous.workers.dev`
