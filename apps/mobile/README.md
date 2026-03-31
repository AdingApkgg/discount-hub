# Discount Hub Mobile

移动端不再单独维护 React Native 视图层，而是使用 Tauri 2 作为轻量外壳，直接加载现有 Web 站点。

## 运行方式

默认会加载 `http://localhost:3000`。如果需要指向测试环境或正式环境，在执行命令前覆盖 `DISCOUNT_HUB_WEB_URL`：

```bash
DISCOUNT_HUB_WEB_URL=https://your-web-domain.example.com pnpm --filter mobile ios:build
DISCOUNT_HUB_WEB_URL=https://your-web-domain.example.com pnpm --filter mobile android:build
```

本地联调建议：

```bash
# 根目录启动 Next.js
pnpm dev

# 另开终端启动 Tauri 壳
DISCOUNT_HUB_WEB_URL=http://localhost:3000 pnpm --filter mobile ios:dev

# 真机联调时可让 Tauri CLI 自动注入可访问的局域网地址
DISCOUNT_HUB_WEB_URL=http://localhost:3000 pnpm --filter mobile ios:dev -- --host
```

## 设计说明

- Tauri 窗口由 Rust 在启动时创建，并直接打开外部 URL
- 当 URL 指向 `localhost` 且存在 `TAURI_DEV_HOST` 时，会自动替换为移动设备可访问的宿主机地址
- 远程页面默认不暴露任何 Tauri JS 能力，避免把 Web 站点自动变成“有原生权限”的页面
- 如果后续确实需要扫码、推送或文件能力，再单独增加插件与 capability
