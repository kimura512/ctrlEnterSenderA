console.log('Ctrl+Enter Sender background script loaded');

chrome.runtime.onInstalled.addListener(() => {
    console.log('Ctrl+Enter Sender installed');
});
