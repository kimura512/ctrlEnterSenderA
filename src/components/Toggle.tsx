import { ChangeEvent } from 'react';

interface ToggleProps {
    id: string;
    checked: boolean;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function Toggle({ id, checked, onChange }: ToggleProps) {
    return (
        <label className="switch">
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={onChange}
            />
            <span className="slider"></span>
        </label>
    );
}
