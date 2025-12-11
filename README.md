# Ctrl+Enter Sender

A Chrome extension that enables sending messages with `Ctrl+Enter` and inserting newlines with `Enter` on various chat applications and websites.

[![GitHub](https://img.shields.io/badge/GitHub-kimura512%2FctrlEnterSenderA-blue)](https://github.com/kimura512/ctrlEnterSenderA)

## 📚 Documentation

### README
- [English](docs/README_en.md)
- [日本語 (Japanese)](docs/README_ja.md)
- [简体中文 (Simplified Chinese)](docs/README_zh_CN.md)

### Architecture
- [English](docs/ARCHITECTURE_en.md)
- [日本語 (Japanese)](docs/ARCHITECTURE_ja.md)
- [简体中文 (Simplified Chinese)](docs/ARCHITECTURE_zh_CN.md)

## Features

- **Send with Ctrl+Enter**: Sends the message immediately when `Ctrl+Enter` (or `Cmd+Enter` on Mac) is pressed.
- **Newline with Enter**: Prevents the default send behavior of the `Enter` key and inserts a newline instead.
- **Wide Compatibility**: Works out-of-the-box with popular platforms like Slack, Discord, Microsoft Teams, Google Chat / Meet, Twitter (X), Facebook Messenger, and many others!
- **Smart Detection**: Automatically detects multi-line text inputs and content-editable areas.
- **Customizable**: Enable/Disable per domain. Some sites (X/Twitter, Google Search, etc.) are disabled by default.

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/kimura512/ctrlEnterSenderA.git
   cd ctrlEnterSenderA
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the extension:
   ```bash
   pnpm run build
   ```
4. Open Chrome and navigate to `chrome://extensions/`.
5. Enable "Developer mode" in the top right corner.
6. Click "Load unpacked" and select the `dist` folder generated in the project directory.

## Usage

Once installed, the extension works automatically on supported sites.

- **Ctrl+Enter (Cmd+Enter on Mac)**: Send message.
- **Enter**: Insert newline.

Click the extension icon in the toolbar to access settings for the current site, or right-click the extension icon and select "Options" to view and manage settings for all domains.

## Development

This project is built with:
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [CRXJS Vite Plugin](https://crxjs.dev/vite-plugin)

### Commands

- `pnpm run dev`: Start the development server (HMR support).
- `pnpm run build`: Build the extension for production.

## Internationalization

This extension supports 30+ languages. The appropriate language is automatically selected based on your browser's language settings.

## License

MIT
