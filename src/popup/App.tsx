import { useEffect, useState, ChangeEvent } from 'react';
import { getDomainConfig, setDomainConfig, getActivationMode, hasOnboardingBeenShown, setOnboardingShown, shouldShowWhatsNew } from '../background/storage';
import { DomainConfig, ActivationMode } from '../types';
import { getMessage } from '../utils/i18n';
import { Onboarding } from '../components/Onboarding';
import { WhatsNew } from '../components/WhatsNew';

function App() {
    const [origin, setOrigin] = useState<string | null>(null); // null = まだ読み込み中、'' = 取得不可
    const [config, setConfig] = useState<DomainConfig | null>(null);
    const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
    const [showWhatsNew, setShowWhatsNew] = useState<boolean>(false);
    const [currentVersion, setCurrentVersion] = useState<string>('');
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [activationMode, setActivationModeState] = useState<ActivationMode>('blacklist');

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

        let isCancelled = false;
        let timeoutId: number | null = null;

        // Timeout fallback (2 seconds) - only fires if loadTabInfo doesn't complete
        timeoutId = setTimeout(() => {
            if (!isCancelled) {
                setOrigin('');
                setConfig({ enabled: false });
                setIsLoaded(true);
            }
        }, 2000);

        const loadTabInfo = async () => {
            try {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (isCancelled) return;
                
                const tab = tabs[0];
                if (tab?.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('about:')) {
                    const url = new URL(tab.url);
                    const tabOrigin = url.origin;
                    if (!isCancelled) {
                        setOrigin(tabOrigin);
                        const loadedConfig = await getDomainConfig(tabOrigin);
                        const mode = await getActivationMode();
                        if (!isCancelled) {
                            setConfig(loadedConfig);
                            setActivationModeState(mode);
                            setIsLoaded(true);
                            // Clear timeout since we successfully loaded
                            if (timeoutId) {
                                clearTimeout(timeoutId);
                                timeoutId = null;
                            }
                        }
                    }
                } else {
                    // Special page (chrome://, about:, etc.)
                    if (!isCancelled) {
                        setOrigin('');
                        setConfig({ enabled: false });
                        setIsLoaded(true);
                        // Clear timeout since we handled the special page
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                            timeoutId = null;
                        }
                    }
                }
            } catch (error) {
                if (!isCancelled) {
                    setOrigin('');
                    setConfig({ enabled: false });
                    setIsLoaded(true);
                    // Clear timeout since we handled the error
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                }
            }
        };

        loadTabInfo();

        return () => {
            isCancelled = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, []);

    const handleEnabledChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!config || !origin) return;
        const newConfig = { ...config, enabled: e.target.checked };
        setConfig(newConfig);
        await setDomainConfig(origin, newConfig);
    };


    // まだ読み込み中（origin === null）の場合のみローディング表示
    if (origin === null && !isLoaded) {
        return <div style={{ padding: '16px' }}>{getMessage('loading')}</div>;
    }

    // 特殊なページの場合は最低限のUIを表示
    const isSpecialPage = !origin;

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
                <div className="domain-value">{origin || getMessage('noDomainAvailable')}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {activationMode === 'whitelist' ? getMessage('modeWhitelist') : getMessage('modeBlacklist')}
                </div>
            </div>

            {!isSpecialPage && config && (
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
            )}

            {isSpecialPage && (
                <div className="card" style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {getMessage('specialPageNotSupported')}
                </div>
            )}

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
