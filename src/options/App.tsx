import { useEffect, useState } from 'react';
import { getAllConfigs, setDomainConfig, hasOnboardingBeenShown, setOnboardingShown, shouldShowWhatsNew } from '../background/storage';
import { StorageSchema, DomainConfig } from '../types';
import { getMessage } from '../utils/i18n';
import { Onboarding } from '../components/Onboarding';
import { WhatsNew } from '../components/WhatsNew';

function App() {
    const [data, setData] = useState<StorageSchema | null>(null);
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

        loadData();
    }, []);

    const loadData = async () => {
        const configs = await getAllConfigs();
        setData(configs);
    };

    const handleConfigChange = async (origin: string, newConfig: DomainConfig) => {
        await setDomainConfig(origin, newConfig);
        await loadData();
    };

    if (!data) {
        return <div style={{ padding: '24px' }}>{getMessage('loading')}</div>;
    }

    const domains = Object.keys(data.domains);

    return (
        <>
            {showOnboarding && (
                <Onboarding onClose={() => setShowOnboarding(false)} />
            )}
            {showWhatsNew && currentVersion && (
                <WhatsNew onClose={() => setShowWhatsNew(false)} version={currentVersion} />
            )}
            <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0 }}>{getMessage('optionsTitle')}</h1>
                <a
                    className="link-button"
                    href="https://github.com/kimura512/ctrlEnterSenderA/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '14px' }}
                >
                    <span>🐛</span> {getMessage('reportIssue')}
                </a>
            </div>

            <div className="card">
                <div className="card-header">
                    {getMessage('configuredDomains')} ({domains.length})
                </div>

                {domains.length === 0 ? (
                    <div className="empty-state">
                        {getMessage('noDomainsConfigured')}
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>{getMessage('domain')}</th>
                                <th>{getMessage('enabled')}</th>
                                <th>{getMessage('mode')}</th>
                                <th>{getMessage('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {domains.map(origin => {
                                const config = data.domains[origin];
                                return (
                                    <tr key={origin}>
                                        <td className="domain-cell">{origin}</td>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={config.enabled}
                                                onChange={(e) => handleConfigChange(origin, { ...config, enabled: e.target.checked })}
                                            />
                                        </td>
                                        <td>
                                            <select
                                                value={config.mode}
                                                onChange={(e) => handleConfigChange(origin, { ...config, mode: e.target.value as any })}
                                            >
                                                <option value="default">{getMessage('modeDefault')}</option>
                                                <option value="forceOn">{getMessage('modeForceOn')}</option>
                                                <option value="forceOff">{getMessage('modeForceOff')}</option>
                                            </select>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-reset"
                                                onClick={() => {
                                                    const confirmMsg = getMessage('resetConfirm', origin);
                                                    if (confirm(confirmMsg)) {
                                                        handleConfigChange(origin, { enabled: true, mode: 'default' });
                                                    }
                                                }}
                                            >
                                                {getMessage('reset')}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-header">
                    {getMessage('supportDeveloper')}
                </div>
                <div style={{ padding: '20px' }}>
                    <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        {getMessage('supportDescription')}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <a
                            href="https://buymeacoffee.com/kimura512"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="support-link"
                        >
                            ☕ {getMessage('buyMeACoffee')}
                        </a>
                        <a
                            href="https://www.patreon.com/c/kimura512"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="support-link"
                        >
                            🎨 {getMessage('patreon')}
                        </a>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}

export default App;
