import { useEffect, useState } from 'react';
import { getAllConfigs, setDomainConfig, getActivationMode, setActivationMode, hasOnboardingBeenShown, setOnboardingShown, shouldShowWhatsNew, groupDomainsByNormalizedOrigin, isDefaultDisabledOrigin, resetAllSettings } from '../background/storage';
import { StorageSchema, DomainConfig, ActivationMode } from '../types';
import { getMessage } from '../utils/i18n';
import { Onboarding } from '../components/Onboarding';
import { WhatsNew } from '../components/WhatsNew';

function App() {
    // 初期状態を空のデータに設定（オフラインでも表示できるように）
    const [data, setData] = useState<StorageSchema>({ domains: {} });
    const [activationMode, setActivationModeState] = useState<ActivationMode>('blacklist');
    const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
    const [showWhatsNew, setShowWhatsNew] = useState<boolean>(false);
    const [currentVersion, setCurrentVersion] = useState<string>('');
    const [showDefaultDomains, setShowDefaultDomains] = useState<boolean>(false);
    const [showUserDomains, setShowUserDomains] = useState<boolean>(false);
    const [showHelp, setShowHelp] = useState<boolean>(false);
    const [showSupport, setShowSupport] = useState<boolean>(false);
    const [ignoreWarning, setIgnoreWarning] = useState<boolean>(false);

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
        getActivationMode().then(mode => setActivationModeState(mode));
    }, []);

    const loadData = async () => {
        try {
            // タイムアウトを設定（3秒でタイムアウト）
            const timeoutPromise = new Promise<StorageSchema>((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), 3000);
            });
            
            const configs = await Promise.race([
                getAllConfigs(),
                timeoutPromise
            ]);
            
            setData(configs);
        } catch (error) {
            // Continue with empty data on error (for offline support)
            setData({ domains: {} });
        }
    };

    const handleConfigChange = async (origin: string, newConfig: DomainConfig) => {
        try {
            await setDomainConfig(origin, newConfig);
            await loadData();
            const mode = await getActivationMode();
            setActivationModeState(mode);
        } catch (error) {
            await loadData();
        }
    };

    const handleModeChange = async (newMode: ActivationMode) => {
        if (newMode === activationMode) return;
        const confirmMsg = getMessage('activationModeChangeConfirm');
        if (!confirm(confirmMsg)) return;
        await setActivationMode(newMode);
        setActivationModeState(newMode);
        await loadData();
    };

    // Group domains by normalized origin
    const groupedDomains = groupDomainsByNormalizedOrigin(data.domains);
    const normalizedOrigins = Object.keys(groupedDomains);
    
    // Separate default disabled domains and user configured domains
    const defaultDisabledOrigins = normalizedOrigins
        .filter(origin => isDefaultDisabledOrigin(origin))
        .sort();
    const userConfiguredOrigins = normalizedOrigins
        .filter(origin => !isDefaultDisabledOrigin(origin))
        .sort();

    // Domain table component
    const DomainTable = ({ origins }: { origins: string[] }) => (
        <table>
            <thead>
                <tr>
                    <th>{getMessage('domain')}</th>
                    <th>{getMessage('enabled')}</th>
                </tr>
            </thead>
            <tbody>
                {origins.map(normalizedOrigin => {
                    const config = groupedDomains[normalizedOrigin];
                    return (
                        <tr key={normalizedOrigin}>
                            <td className="domain-cell">{normalizedOrigin}</td>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={config.enabled}
                                    onChange={(e) => handleConfigChange(normalizedOrigin, { ...config, enabled: e.target.checked })}
                                />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    return (
        <>
            {showOnboarding && (
                <Onboarding onClose={() => setShowOnboarding(false)} />
            )}
            {showWhatsNew && currentVersion && (
                <WhatsNew onClose={() => setShowWhatsNew(false)} version={currentVersion} />
            )}
            <div className="container">
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{ margin: 0 }}>{getMessage('optionsTitle')}</h1>
                <button
                    className="btn-reset"
                    onClick={async () => {
                        const confirmMsg = getMessage('resetAllConfirm');
                        if (confirm(confirmMsg)) {
                            // 全設定をリセット（ドメインリストもクリア）
                            await resetAllSettings();
                            await loadData();
                            // モードも初期化
                            setActivationModeState('blacklist');
                        }
                    }}
                >
                    {getMessage('resetAll')}
                </button>
            </div>

            {/* モード切替セクション */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header" style={{ justifyContent: 'flex-start' }}>
                    {getMessage('activationMode')}
                </div>
                <div style={{ padding: '16px' }}>
                    <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                        {getMessage('activationModeDescription')}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '12px', borderRadius: '8px', border: activationMode === 'blacklist' ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)', backgroundColor: activationMode === 'blacklist' ? 'rgba(59, 130, 246, 0.05)' : 'transparent', transition: 'all 0.2s' }}>
                            <input
                                type="radio"
                                name="activationMode"
                                value="blacklist"
                                checked={activationMode === 'blacklist'}
                                onChange={() => handleModeChange('blacklist')}
                                style={{ marginTop: '2px' }}
                            />
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{getMessage('blacklistMode')}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{getMessage('blacklistModeDesc')}</div>
                            </div>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '12px', borderRadius: '8px', border: activationMode === 'whitelist' ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)', backgroundColor: activationMode === 'whitelist' ? 'rgba(59, 130, 246, 0.05)' : 'transparent', transition: 'all 0.2s' }}>
                            <input
                                type="radio"
                                name="activationMode"
                                value="whitelist"
                                checked={activationMode === 'whitelist'}
                                onChange={() => handleModeChange('whitelist')}
                                style={{ marginTop: '2px' }}
                            />
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{getMessage('whitelistMode')}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{getMessage('whitelistModeDesc')}</div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* 初期設定済みドメイン (ブラックリストモードのみ表示) */}
            {activationMode === 'blacklist' && defaultDisabledOrigins.length > 0 && (
                <div className="card">
                    <div 
                        className="card-header" 
                        style={{ cursor: 'pointer', userSelect: 'none', justifyContent: 'flex-start' }}
                        onClick={() => setShowDefaultDomains(!showDefaultDomains)}
                    >
                        <span style={{ marginRight: '8px' }}>{showDefaultDomains ? '▼' : '▶'}</span>
                        {getMessage('defaultConfiguredDomains')} ({defaultDisabledOrigins.length})
                    </div>

                    {showDefaultDomains && <DomainTable origins={defaultDisabledOrigins} />}
                </div>
            )}

            {/* ユーザー設定ドメイン */}
            <div className="card" style={{ marginTop: defaultDisabledOrigins.length > 0 ? '24px' : '0' }}>
                <div 
                    className="card-header" 
                    style={{ cursor: 'pointer', userSelect: 'none', justifyContent: 'flex-start' }}
                    onClick={() => setShowUserDomains(!showUserDomains)}
                >
                    <span style={{ marginRight: '8px' }}>{showUserDomains ? '▼' : '▶'}</span>
                    {getMessage('userConfiguredDomains')} ({userConfiguredOrigins.length})
                </div>

                {showUserDomains && (
                    userConfiguredOrigins.length === 0 ? (
                        <div className="empty-state">
                            {getMessage('noDomainsConfigured')}
                        </div>
                    ) : (
                        <DomainTable origins={userConfiguredOrigins} />
                    )
                )}
            </div>


            {/* ヘルプ */}
            <div className="card" style={{ marginTop: '24px' }}>
                <div 
                    className="card-header" 
                    style={{ cursor: 'pointer', userSelect: 'none', justifyContent: 'flex-start' }}
                    onClick={() => setShowHelp(!showHelp)}
                >
                    <span style={{ marginRight: '8px' }}>{showHelp ? '▼' : '▶'}</span>
                    {getMessage('helpTitle')}
                </div>
                {showHelp && (
                    <div style={{ padding: '20px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{getMessage('onboardingTitle')}</h3>
                        <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>{getMessage('onboardingDescription')}</p>
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <span style={{ fontWeight: '600' }}>Enter</span>
                                <span style={{ marginLeft: '8px' }}>{getMessage('onboardingEnterNewline')}</span>
                            </div>
                            <div>
                                <span style={{ fontWeight: '600' }}>Ctrl+Enter</span>
                                <span style={{ marginLeft: '8px' }}>{getMessage('onboardingCtrlEnterSend')}</span>
                            </div>
                        </div>
                        <div style={{ lineHeight: '1.6' }}>
                            <p style={{ marginBottom: '12px' }}>{getMessage('onboardingDefaultEnabled')}</p>
                            <p style={{ marginBottom: '12px' }}>{getMessage('onboardingSiteToggle')}</p>
                            <p style={{ marginBottom: '24px' }}>{getMessage('onboardingAdvancedSettings')}</p>
                        </div>
                        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <a
                                    href="https://chromewebstore.google.com/detail/ctrl+enter-sender/ljdnloldejpgadgefnpmkngnapfbepig"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '14px' }}
                                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                >
                                    🌐 Chrome Web Store
                                </a>
                                <a
                                    href="https://github.com/kimura512/ctrlEnterSenderA"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '14px' }}
                                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                >
                                    💻 GitHub Repository
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
                <div 
                    className="card-header" 
                    style={{ cursor: 'pointer', userSelect: 'none', justifyContent: 'flex-start' }}
                    onClick={() => setShowSupport(!showSupport)}
                >
                    <span style={{ marginRight: '8px' }}>{showSupport ? '▼' : '▶'}</span>
                    {getMessage('supportDeveloper')}
                </div>
                {showSupport && (
                    <div style={{ padding: '20px' }}>
                        <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'rgba(255, 82, 82, 0.1)', border: '1px solid var(--danger-color)', borderRadius: '8px' }}>
                            <p style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', lineHeight: '1.6', fontWeight: '600', fontSize: '16px' }}>
                                {getMessage('supportWarningTitle')}
                            </p>
                            <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                {getMessage('supportWarningMessage1')}
                            </p>
                            <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                {getMessage('supportWarningMessage2')}
                            </p>
                            <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                {getMessage('supportWarningMessage3')}
                            </p>
                            <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                {getMessage('supportWarningMessage4')} <span className="hidden-comment">{getMessage('supportWarningMessage5')}</span> {getMessage('supportWarningMessage6')}
                            </p>
                            <p style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', lineHeight: '1.6', fontWeight: '600' }}>
                                {getMessage('supportWarningMessage7')}
                            </p>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                                <input
                                    type="checkbox"
                                    checked={ignoreWarning}
                                    onChange={(e) => setIgnoreWarning(e.target.checked)}
                                />
                                <span style={{ color: 'var(--text-secondary)' }}>{getMessage('ignoreWarningCheckbox')}</span>
                            </label>
                        </div>
                        {ignoreWarning && (
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
                        )}
                    </div>
                )}
            </div>

            {/* バグ報告 | 機能要望 */}
            <div className="card" style={{ marginTop: '24px' }}>
                <a
                    className="report-issue-link"
                    href="https://github.com/kimura512/ctrlEnterSenderA/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'block', padding: '20px' }}
                >
                    <span>🐛</span> {getMessage('reportIssue')}
                </a>
            </div>
        </div>
        </>
    );
}

export default App;
