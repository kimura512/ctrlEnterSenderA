# Ctrl+Enter Sender

## README

- [English](docs/README_en.md)
- [日本語 (Japanese)](docs/README_ja.md)
- [简体中文 (Simplified Chinese)](docs/README_zh_CN.md)

## Changelog

### v1.1.1 (2024-12-18)

#### New Features
- **Grok (grok.com) support**: Added support for Grok AI chat. Enter now inserts a newline, and Ctrl+Enter (Cmd+Enter on Mac) sends the message.

#### Bug Fixes
- **Gmail compatibility**: Fixed an issue where the extension was interfering with Gmail's native behavior. Gmail (mail.google.com) is now completely excluded from the extension's scope, preserving its native Enter=newline, Ctrl+Enter=send behavior.

#### Notes
- **Google Chat**: Currently not supported due to technical limitations. Google Chat's aggressive event handling makes it difficult to intercept key events.

### v1.1.0

- Initial public release with support for Slack, Discord, Microsoft Teams, ChatGPT, and many other messaging platforms.
