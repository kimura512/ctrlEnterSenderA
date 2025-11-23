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
        <div className="container">
            <h1>Ctrl+Enter Sender Settings</h1>

            <div className="card">
                <div className="card-header">
                    Configured Domains ({domains.length})
                </div>

                {domains.length === 0 ? (
                    <div className="empty-state">
                        No domain configurations saved yet. Visit a site and use the popup to configure.
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Domain</th>
                                <th>Enabled</th>
                                <th>Mode</th>
                                <th>Actions</th>
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
                                                <option value="default">Default</option>
                                                <option value="forceOn">Force On</option>
                                                <option value="forceOff">Force Off</option>
                                            </select>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-reset"
                                                onClick={() => {
                                                    if (confirm(`Are you sure you want to reset settings for ${origin}?`)) {
                                                        handleConfigChange(origin, { enabled: true, mode: 'default' });
                                                    }
                                                }}
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
