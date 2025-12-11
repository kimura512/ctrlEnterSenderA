# Ctrl+Enter Sender

A Chrome extension that enables sending messages with `Ctrl+Enter` and inserting newlines with `Enter` on various chat applications and websites.

## Features

- **Send with Ctrl+Enter**: Sends the message immediately when `Ctrl+Enter` (or `Cmd+Enter` on Mac) is pressed.
- **Newline with Enter**: Prevents the default send behavior of the `Enter` key and inserts a newline instead.
- **Wide Compatibility**: Works out-of-the-box with popular platforms like:
  - Slack
  - Discord
  - Microsoft Teams
  - Google Chat / Meet
  - Twitter (X)
  - Facebook Messenger
  - And many others!
- **Smart Detection**: Automatically detects multi-line text inputs and content-editable areas.
- **Customizable**:
  - Enable/Disable per domain.
  - Some sites (X/Twitter, Google Search, etc.) are disabled by default.

## Installation

### From Source

1. Clone this repository.
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

### Popup Menu

Click the extension icon in the toolbar to access settings for the current site:
- **Enable/Disable**: Toggle the extension for the current domain.

### Options Page

Right-click the extension icon and select "Options" to view and manage settings for all domains.

- **Default Configured Domains**: Domains that are disabled by default (X/Twitter, Google Search, etc.)
- **User Configured Domains**: Domains configured by the user
- **Reset All Button**: Reset all settings to the initial installation state

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

