import { getMessage } from '../utils/i18n';
import './Onboarding.css';

interface OnboardingProps {
    onClose: () => void;
}

export function Onboarding({ onClose }: OnboardingProps) {
    return (
        <div className="onboarding-overlay">
            <div className="onboarding-modal">
                <h2 className="onboarding-title">{getMessage('onboardingTitle')}</h2>
                <p className="onboarding-description">{getMessage('onboardingDescription')}</p>
                <div className="onboarding-features">
                    <div className="onboarding-feature">
                        <span className="onboarding-key">Enter</span>
                        <span className="onboarding-arrow">→</span>
                        <span className="onboarding-action">{getMessage('onboardingEnterNewline')}</span>
                    </div>
                    <div className="onboarding-feature">
                        <span className="onboarding-key">Ctrl+Enter</span>
                        <span className="onboarding-arrow">→</span>
                        <span className="onboarding-action">{getMessage('onboardingCtrlEnterSend')}</span>
                    </div>
                </div>
                <div className="onboarding-info">
                    <p>{getMessage('onboardingSiteToggle')}</p>
                    <p>{getMessage('onboardingAdvancedSettings')}</p>
                </div>
                <button className="onboarding-button" onClick={onClose}>
                    {getMessage('onboardingGotIt')}
                </button>
            </div>
        </div>
    );
}

