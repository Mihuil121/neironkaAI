'use client'
import { useEffect } from 'react';

export default function ThemeClient() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('theme') || 'dark';
      document.body.classList.remove('theme-dark', 'theme-light');
      document.body.classList.add(`theme-${theme}`);
    }
  }, []);
  return null;
} 