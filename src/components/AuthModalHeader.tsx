import React from 'react';
import styles from './AuthModal.module.scss';
import { FiX } from 'react-icons/fi';

interface AuthModalHeaderProps {
  isLogin: boolean;
  onSwitch: () => void;
}

export default function AuthModalHeader({ isLogin, onSwitch }: AuthModalHeaderProps) {
  return (
    <div className={styles.header}>
      <h2>{isLogin ? 'Вход' : 'Регистрация'}</h2>
      <button className={styles.switchButton} onClick={onSwitch} type="button">
        {isLogin ? 'Создать аккаунт' : 'Уже есть аккаунт? Войти'}
      </button>
    </div>
  );
} 