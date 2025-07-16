'use client';

import { useState } from 'react';
import { FiUser, FiChevronDown } from 'react-icons/fi';
import styles from './AccountButton.module.scss';
import SettingsModal from './SettingsModal';
import { useAuthStore } from '@/store/useAuthStore';
import AccountAvatar from './AccountAvatar';
import AccountName from './AccountName';

export default function AccountButton() {
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <>
      <button className={styles.accountBtn} onClick={() => setOpen(true)}>
        <AccountAvatar />
        <AccountName name={user?.name} />
        <FiChevronDown className={styles.chevron} />
      </button>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
} 