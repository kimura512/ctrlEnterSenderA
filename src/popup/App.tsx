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
        <div style={{ width: '300px', padding: '16px', fontFamily: 'sans-serif' }}>
            <h2 style={{ fontSize: '16px', margin: '0 0 16px' }}>Ctrl+Enter Sender</h2>

            <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Current Domain</div>
                <div style={{ fontWeight: 'bold', wordBreak: 'break-all' }}>{origin}</div>
            </div>

            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label htmlFor="enabled-toggle" style={{ cursor: 'pointer' }}>Enable for this site</label>
                <input
                    id="enabled-toggle"
                    type="checkbox"
                    checked={config.enabled}
                    onChange={handleEnabledChange}
                    style={{ cursor: 'pointer' }}
                />
            </div>

            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Detection Mode</label>
                <select
                    value={config.mode}
                    onChange={handleModeChange}
                    style={{ width: '100%', padding: '4px' }}
                >
                    <option value="default">Default (Auto Detect)</option>
                    <option value="forceOn">Force On (Aggressive)</option>
                    <option value="forceOff">Force Off (Disable)</option>
                </select>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {config.mode === 'default' && 'Standard detection logic.'}
                    {config.mode === 'forceOn' && 'Treats most inputs as targets.'}
                    {config.mode === 'forceOff' && 'Disables extension on this site.'}
                </div>
            </div>

            <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', textAlign: 'right' }}>
                <button
                    onClick={() => chrome.runtime.openOptionsPage()}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#0066cc',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textDecoration: 'underline'
                    }}
                >
                    Open Advanced Settings
                </button>
            </div>
        </div>
    );
}

export default App;
