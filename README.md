# FileComparator

一款基于 Tauri 2 + React + Monaco Editor 构建的跨平台桌面文件与文本对比工具。

## 功能特性

- **文件对比模式** — 通过系统对话框选取本地文件，自动读取并进行逐行差异对比
- **文本对比模式** — 直接在编辑器中输入或粘贴文本进行实时比较
- **双栏差异视图** — 经典左右布局，新增、删除、修改一目了然
- **左右对调** — 一键交换原始与修改内容
- **一键清空** — 快速重置编辑器状态
- **MiniMap 导航** — 快速定位差异位置
- **中英双语** — 内置中文 / English 切换，偏好自动保存
- **自适应布局** — 编辑器随窗口大小自动调整
- **跨平台** — 支持 Windows、macOS、Linux

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2 (Rust) |
| 前端 | React 18 + TypeScript |
| 对比引擎 | Monaco Editor Diff |
| 构建工具 | Vite 5 |
| 图标库 | Lucide React |

## 开发环境

### 前置依赖

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/tools/install) >= 1.77
- [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### 安装与运行

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建生产包
npm run tauri build
```

## 项目结构

```
file-comparator/
├── src/                    # React 前端源码
│   ├── App.tsx             # 主应用组件
│   ├── App.css             # 样式
│   └── main.tsx            # 入口
├── src-tauri/              # Tauri / Rust 后端
│   ├── src/
│   │   ├── lib.rs          # Tauri 插件注册
│   │   └── main.rs         # 入口
│   ├── Cargo.toml
│   └── tauri.conf.json     # Tauri 配置
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 截图

> 启动后默认进入文件对比模式，点击左侧导航栏可切换至文本对比模式。

## 许可证

MIT
