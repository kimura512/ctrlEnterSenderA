# Ctrl+Enter Sender

一个Chrome扩展，可在各种聊天应用程序和网站上使用 `Ctrl+Enter` 发送消息，使用 `Enter` 插入换行。

## 功能

- **Ctrl+Enter 发送**: 按下 `Ctrl+Enter`（Mac上为 `Cmd+Enter`）时，消息会立即发送。
- **Enter 换行**: 阻止 `Enter` 键的默认发送行为，改为插入换行。
- **广泛兼容性**: 可在以下流行平台上开箱即用：
  - Slack
  - Discord
  - Microsoft Teams
  - Google Chat / Meet
  - Twitter (X)
  - Facebook Messenger
  - 以及更多！
- **智能检测**: 自动检测多行文本输入框和content-editable区域。
- **可自定义**:
  - 可按域名启用/禁用
  - 某些网站（X/Twitter、Google搜索等）默认禁用

## 安装

### 从源代码安装

1. 克隆此仓库。
2. 安装依赖项：
   ```bash
   pnpm install
   ```
3. 构建扩展：
   ```bash
   pnpm run build
   ```
4. 打开Chrome并导航到 `chrome://extensions/`。
5. 在右上角启用"开发者模式"。
6. 点击"加载未打包的扩展程序"，选择项目目录中生成的 `dist` 文件夹。

## 使用方法

安装后，扩展会在支持的网站上自动工作。

- **Ctrl+Enter（Mac上为Cmd+Enter）**: 发送消息
- **Enter**: 插入换行

### 弹出菜单

点击工具栏中的扩展图标可访问当前网站的设置：
- **启用/禁用**: 切换当前域名的扩展启用状态

### 选项页面

右键点击扩展图标并选择"选项"可查看和管理所有域名的设置。

- **默认配置的域名**: 默认禁用的域名（X/Twitter、Google搜索等）
- **用户配置的域名**: 用户配置的域名
- **初始化按钮**: 将所有设置重置为初始安装状态

## 开发

此项目使用以下技术构建：
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [CRXJS Vite Plugin](https://crxjs.dev/vite-plugin)

### 命令

- `pnpm run dev`: 启动开发服务器（支持HMR）
- `pnpm run build`: 构建生产版本的扩展

## 国际化

此扩展支持30多种语言。会根据浏览器的语言设置自动选择适当的语言。

## 许可证

MIT

