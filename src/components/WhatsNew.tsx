import { getMessage } from '../utils/i18n';
import './WhatsNew.css';

interface WhatsNewProps {
    onClose: () => void;
    version: string;
}

export function WhatsNew({ onClose, version }: WhatsNewProps) {
    return (
        <div className="whatsnew-overlay">
            <div className="whatsnew-modal">
                <h2 className="whatsnew-title">{getMessage('whatsNewTitle')}</h2>
                <div className="whatsnew-content">
                    <p className="whatsnew-description">{getMessage('whatsNewDescription')}</p>
                    <div className="whatsnew-version">
                        {getMessage('version')}: {version}
                    </div>
                </div>
                <button className="whatsnew-button" onClick={onClose}>
                    {getMessage('whatsNewClose')}
                </button>
            </div>
        </div>
    );
}

