import { useEffect, useState } from 'react';
import { getAllConfigs, setDomainConfig } from '../background/storage';
import { StorageSchema, DomainConfig } from '../types';

function App() {
    const [data, setData] = useState<StorageSchema | null>(null);

    useEffect(() => {
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
        return <div style={{ padding: '24px' }}>Loading...</div>;
    }

    const domains = Object.keys(data.domains);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h1>Ctrl+Enter Sender Settings</h1>

            <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
                    Configured Domains ({domains.length})
                </div>

                {domains.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#666' }}>
                        No domain configurations saved yet. Visit a site and use the popup to configure.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9f9f9', textAlign: 'left' }}>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Domain</th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Enabled</th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Mode</th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {domains.map(origin => {
                                const config = data.domains[origin];
                                return (
                                    <tr key={origin} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px 16px' }}>{origin}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <input
                                                type="checkbox"
                                                checked={config.enabled}
                                                onChange={(e) => handleConfigChange(origin, { ...config, enabled: e.target.checked })}
                                            />
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <select
                                                value={config.mode}
                                                onChange={(e) => handleConfigChange(origin, { ...config, mode: e.target.value as any })}
                                                style={{ padding: '4px' }}
                                            >
                                                <option value="default">Default</option>
                                                <option value="forceOn">Force On</option>
                                                <option value="forceOff">Force Off</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Are you sure you want to reset settings for ${origin}?`)) {
                                                        // Delete logic not implemented in storage helper yet, but we can disable it or just reset to default
                                                        handleConfigChange(origin, { enabled: true, mode: 'default' });
                                                    }
                                                }}
                                                style={{ color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                Reset
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default App;
