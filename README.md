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
  - "Force On" mode for stubborn sites.
  - "Force Off" mode to disable on specific sites.
  - Custom selector targeting.

## Installation

### From Source

1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Open Chrome and navigate to `chrome://extensions/`.
5. Enable "Developer mode" in the top right corner.
6. Click "Load unpacked" and select the `dist` folder generated in the project directory.

## Usage

Once installed, the extension works automatically on supported sites.

- **Ctrl+Enter (Cmd+Enter)**: Send message.
- **Enter**: Insert newline.

### Popup Menu

Click the extension icon in the toolbar to access settings for the current site:
- **Enable/Disable**: Toggle the extension for the current domain.
- **Mode**:
  - **Default**: Standard detection logic.
  - **Force On**: Forces the extension to be active on all inputs (use with caution).
  - **Force Off**: Completely disables the extension on the current domain.

### Options Page

Right-click the extension icon and select "Options" to view and manage settings for all domains.

## Development

This project is built with:
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [CRXJS Vite Plugin](https://crxjs.dev/vite-plugin)

### Commands

- `npm run dev`: Start the development server (HMR support).
- `npm run build`: Build the extension for production.

## License

MIT
