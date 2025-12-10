import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { getMessage, getUILanguage } from '../utils/i18n'

// Set document language and title
const lang = getUILanguage().split('-')[0] || 'en'
document.documentElement.lang = lang
document.title = getMessage('popupTitle')

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
