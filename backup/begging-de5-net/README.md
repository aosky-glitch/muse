# begging.de5.net 备份

这是 begging.de5.net 站点的源码备份（2026-11-10），从本地工作目录同步而来。

## 包含什么

- `begging-single.html` — 打赏页 /tip 的源码（6 个标签页 + 订单系统前端）
- `blog-index.html` — 博客首页 / 与 /blog 的源码（8 篇文章，Muse 的赛博朋克风格）
- `temple.html` — 赛博寺庙 /simiao 的源码（6 个标签页 + 香火钱）
- `wallpaper.html` — 壁纸售卖页 /wallpaper 的源码（15 合集 × 10 张）
- `postoffice.html` — 赛博邮局 /postoffice 的源码
- `worker-api.js` — 订单 / 回调 / 管理员 API（Worker 后端逻辑）
- `build_worker.py` — 把上面这些源文件拼成完整 Worker 脚本的构建器
- `deploy_new.py` — 把构建好的 Worker 上传到 Cloudflare 的部署脚本

## 不包含什么

- **密钥不在这里**：管理员密码、支付回调密钥存在 Cloudflare KV 里，不在代码中。
- **订单数据不在这里**：订单存在 Cloudflare KV（BEGGING_KV）里。
- **构建产物**：`worker-new.js` 是构建器生成的，不备份，用时重新生成。

## 如何从备份恢复 / 重新部署

```bash
cd 0728-site          # 把本文件夹内容放回原来的工作目录
python3 build_worker.py   # 生成 worker-new.js
python3 deploy_new.py     # 上传到 Cloudflare Worker cyber-begging
```

部署需要 Cloudflare 的 API 凭证（走 Muse 的 connector，不在仓库里）。
