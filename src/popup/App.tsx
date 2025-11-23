import React, { useEffect, useState } from 'react';
import { getDomainConfig, setDomainConfig } from '../background/storage';
import { DomainConfig, DomainMode } from '../types';

function App() {
    const [origin, setOrigin] = useState<string>('');
    const [config, setConfig] = useState<DomainConfig | null>(null);

    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const tab = tabs[0];
            if (tab?.url) {
                const url = new URL(tab.url);
                const tabOrigin = url.origin;
                setOrigin(tabOrigin);
                const loadedConfig = await getDomainConfig(tabOrigin);
                setConfig(loadedConfig);
            }
        });
    }, []);

    const handleEnabledChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!config || !origin) return;
        const newConfig = { ...config, enabled: e.target.checked };
        setConfig(newConfig);
        await setDomainConfig(origin, newConfig);
    };

    const handleModeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!config || !origin) return;
        const newConfig = { ...config, mode: e.target.value as DomainMode };
        setConfig(newConfig);
        await setDomainConfig(origin, newConfig);
    };

    if (!origin) {
        return <div style={{ padding: '16px' }}>Loading...</div>;
    }

    if (!config) {
        return <div style={{ padding: '16px' }}>Loading config...</div>;
    }

    return (
        <div className="container">
            <div className="header">
                <h2 className="title">Ctrl+Enter Sender</h2>
            </div>

            <div className="card">
                <div className="domain-label">Current Domain</div>
                <div className="domain-value">{origin}</div>
            </div>

            <div className="card row">
                <label htmlFor="enabled-toggle" className="label" style={{ cursor: 'pointer' }}>Enable for this site</label>
                <label className="switch">
                    <input
                        id="enabled-toggle"
                        type="checkbox"
                        checked={config.enabled}
                        onChange={handleEnabledChange}
                    />
                    <span className="slider"></span>
                </label>
            </div>

            <div className="card">
                <label className="label" style={{ display: 'block', marginBottom: '12px' }}>Detection Mode</label>
                <select
                    value={config.mode}
                    onChange={handleModeChange}
                >
                    <option value="default">Default (Auto Detect)</option>
                    <option value="forceOn">Force On (Aggressive)</option>
                    <option value="forceOff">Force Off (Disable)</option>
                </select>
                <div className="description">
                    {config.mode === 'default' && 'Standard detection logic. Works on most sites.'}
                    {config.mode === 'forceOn' && 'Treats almost all inputs as targets. Use if detection fails.'}
                    {config.mode === 'forceOff' && 'Completely disables the extension on this site.'}
                </div>
            </div>

            <div className="footer">
                <button
                    className="link-button"
                    onClick={() => chrome.runtime.openOptionsPage()}
                >
                    <span>⚙️</span> Advanced Settings
                </button>
            </div>
        </div>
    );
}

export default App;
