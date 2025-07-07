'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './SettingsModal.module.scss';
import { useTranslation } from '@/lib/translations';
import { useTheme } from 'next-themes';
import { useChatStore } from '@/store/useChatStore';

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
  const { theme, setTheme, systemTheme } = useTheme();
  const { chatThemeLight, toggleChatTheme } = useChatStore();

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

  const handleSave = () => {
    setApiKey(localApiKey);
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
          <label htmlFor="chatThemeSwitch">Тема чата:</label>
          <button
            id="chatThemeSwitch"
            type="button"
            className={styles.saveBtn}
            style={{marginBottom: 8, width: '100%'}}
            onClick={toggleChatTheme}
          >
            {chatThemeLight ? 'Светлая тема' : 'Тёмная тема'}
          </button>
          <p className={styles.hint}>
            Меняет оформление только области чата
          </p>
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