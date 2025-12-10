import React, { useEffect, useState } from 'react';
import { getDomainConfig, setDomainConfig, hasOnboardingBeenShown, setOnboardingShown, shouldShowWhatsNew } from '../background/storage';
import { DomainConfig, DomainMode } from '../types';
import { getMessage } from '../utils/i18n';
import { Onboarding } from '../components/Onboarding';
import { WhatsNew } from '../components/WhatsNew';

function App() {
    const [origin, setOrigin] = useState<string>('');
    const [config, setConfig] = useState<DomainConfig | null>(null);
    const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
    const [showWhatsNew, setShowWhatsNew] = useState<boolean>(false);
    const [currentVersion, setCurrentVersion] = useState<string>('');

    useEffect(() => {
        // Get current version from manifest
        const manifest = chrome.runtime.getManifest();
        const version = manifest.version;
        setCurrentVersion(version);
        // Check if onboarding should be shown
        hasOnboardingBeenShown().then(shown => {
            if (!shown) {
                setShowOnboarding(true);
                setOnboardingShown();
            } else {
                // Only show What's New if onboarding was already shown
                shouldShowWhatsNew(version).then(show => {
                    setShowWhatsNew(show);
                });
            }
        });

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
        return <div style={{ padding: '16px' }}>{getMessage('loading')}</div>;
    }

    if (!config) {
        return <div style={{ padding: '16px' }}>{getMessage('loadingConfig')}</div>;
    }

    return (
        <>
            {showOnboarding && (
                <Onboarding onClose={() => setShowOnboarding(false)} />
            )}
            {showWhatsNew && currentVersion && (
                <WhatsNew onClose={() => setShowWhatsNew(false)} version={currentVersion} />
            )}
            <div className="container">
            <div className="header">
                <h2 className="title">{getMessage('popupTitle')}</h2>
            </div>

            <div className="card">
                <div className="domain-label">{getMessage('currentDomain')}</div>
                <div className="domain-value">{origin}</div>
            </div>

            <div className="card row">
                <label htmlFor="enabled-toggle" className="label" style={{ cursor: 'pointer' }}>{getMessage('enableForThisSite')}</label>
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
                <label className="label" style={{ display: 'block', marginBottom: '12px' }}>{getMessage('detectionMode')}</label>
                <select
                    value={config.mode}
                    onChange={handleModeChange}
                >
                    <option value="default">{getMessage('modeDefault')}</option>
                    <option value="forceOn">{getMessage('modeForceOn')}</option>
                    <option value="forceOff">{getMessage('modeForceOff')}</option>
                </select>
                <div className="description">
                    {config.mode === 'default' && getMessage('modeDefaultDescription')}
                    {config.mode === 'forceOn' && getMessage('modeForceOnDescription')}
                    {config.mode === 'forceOff' && getMessage('modeForceOffDescription')}
                </div>
            </div>

            <div className="footer">
                <button
                    className="link-button"
                    onClick={() => chrome.runtime.openOptionsPage()}
                >
                    <span>⚙️</span> {getMessage('advancedSettings')}
                </button>
                <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>•</span>
                <a
                    className="link-button"
                    href="https://github.com/kimura512/ctrlEnterSenderA/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <span>🐛</span> {getMessage('reportIssue')}
                </a>
            </div>
        </div>
        </>
    );
}

export default App;
