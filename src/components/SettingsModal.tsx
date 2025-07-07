'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './SettingsModal.module.scss';
import { useTranslation } from '@/lib/translations';

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'zh-Hans', label: '中文' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { language, setLanguage, apiKey, setApiKey } = useAuthStore();
  const { t } = useTranslation();
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });
  const THEMES = [
    { code: 'dark', label: t('darkTheme') },
    { code: 'light', label: t('lightTheme') },
  ];

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalApiKey(e.target.value);
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value);
  };

  const handleSave = () => {
    setApiKey(localApiKey);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
      document.body.classList.remove('theme-dark', 'theme-light');
      document.body.classList.add(`theme-${theme}`);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
        <h2 className={styles.title}>Настройки</h2>
        <div className={styles.section}>
          <label htmlFor="lang">Язык интерфейса:</label>
          <select id="lang" value={language} onChange={handleLangChange} className={styles.select}>
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.section}>
          <label htmlFor="apiKey">API Ключ OpenRouter:</label>
          <input
            type="password"
            id="apiKey"
            value={localApiKey}
            onChange={handleApiKeyChange}
            placeholder="sk-or-v1-..."
            className={styles.input}
          />
          <p className={styles.hint}>
            Оставьте пустым для использования дефолтного ключа
          </p>
        </div>
        <div className={styles.section}>
          <label htmlFor="theme">{t('theme')}</label>
          <select id="theme" value={theme} onChange={handleThemeChange} className={styles.select}>
            {THEMES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.actions}>
          <button className={styles.saveBtn} onClick={handleSave}>
            Сохранить
          </button>
          <button className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
} 