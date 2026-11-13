# FileComparator

简体中文 | [English](README.en.md)

一款基于 Tauri 2 + React + Monaco Editor 构建的跨平台桌面文件与文本对比工具。

## 下载

从 [GitHub Releases](https://github.com/wuyufei1993/file-comparator/releases/latest) 下载最新版本的 Windows 安装包（`.exe` 或 `.msi`）。macOS 和 Linux 可按下方说明从源码构建。

## 功能特性

- **统一对比界面** — 两侧均可直接输入、粘贴文本或选择本地文件，无需切换模式，也支持文件与文本混合对比
- **文件载入后可编辑** — 文件内容载入当前编辑区后可继续修改并实时比较，原文件不会被修改
- **一体化窗口栏** — 桌面版移除系统标题栏，最小化、最大化 / 还原、关闭按钮整合到顶部工具栏；拖动顶部空白区域移动窗口，双击可最大化 / 还原
- **双栏差异视图** — 经典左右布局，新增、删除、修改一目了然
- **左右对调** — 一键交换原始与修改内容
- **一键清空** — 快速重置编辑器状态
- **MiniMap 导航** — 快速定位差异位置
- **中英双语** — 内置中文 / English 切换，偏好自动保存
- **自适应布局** — 编辑器随窗口大小自动调整
- **差异导航** — 显示差异块及新增 / 删除行数，支持上一处 / 下一处按钮与编辑器内 `F7` / `Shift+F7`
- **可撤销清空** — 清空后可通过提示条恢复；继续编辑或载入文件后撤销入口失效
- **编辑偏好** — 忽略行首尾空格、自动换行、字号、缩略图与语言偏好保存在本地
- **离线编辑器** — Monaco 和 Worker 随应用打包，不依赖 CDN；首次进入对比时按需加载
- **文件校验** — 支持最大 10 MB 的 UTF-8 文本，提供二进制 / 编码错误反馈，原文件不会被修改
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
- [Rust](https://www.rust-lang.org/tools/install) >= 1.77.2
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

### 网页预览与部署

无需 Rust 即可运行网页版本，使用浏览器文件选择器读取本地文本：

```bash
npm ci
npm run dev
# 生产构建与本地预览
npm run build
npm run preview -- --host 127.0.0.1
```

将 `dist/` 部署到静态 Web 服务即可运行网页版本。必须通过 HTTP(S) 访问，以便正确加载编辑器 Worker。桌面安装包仍需 Rust/Cargo 及目标平台的 Tauri 构建依赖；Windows 需要 MSVC C++ 构建工具与 WebView2。

### 品牌图标

`public/logo.svg` 是可编辑的矢量源文件，以两份并排文档与双向对比箭头表现软件用途。界面及网页 favicon 使用同一图标，`src-tauri/icons/` 包含生成的 PNG、ICO、ICNS 和各平台尺寸。

```bash
npm run tauri icon public/logo.svg
```

## 项目结构

```
file-comparator/
├── src/                    # React 前端源码
│   ├── App.tsx             # 主应用组件
│   ├── App.css             # 紧凑工具栏、双栏编辑器与设置样式
│   ├── ComparisonEditor.tsx # 按需加载的编辑器入口
│   ├── monaco.ts           # 本地 Monaco 与 Worker 配置
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

## 使用说明

启动后即可在左右编辑区直接输入或粘贴文本，也可通过各侧的「选择文件」按钮载入文件，无需切换模式。桌面窗口控制与顶部操作栏合并，底部保留显示选项与差异导航；语言、字号与缩略图集中在设置中。关闭或刷新应用后不保留对比内容。

## 许可证

MIT
