import React from 'react';
import styles from './AuthModal.module.scss';

interface AuthInputProps {
  label: string;
  type: string;
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
}

export default function AuthInput({ label, type, id, name, value, onChange, required, placeholder }: AuthInputProps) {
  return (
    <div className={styles.inputGroup}>
      <label htmlFor={id}>{label}</label>
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={styles.input}
      />
    </div>
  );
} 