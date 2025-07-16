import { FiX } from 'react-icons/fi';
import styles from './ShareModal.module.scss';

export default function ShareModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.header}>
      <button className={styles.closeBtn} onClick={onClose} title="Закрыть">
        <FiX />
      </button>
      <h2>Поделиться чатом</h2>
    </div>
  );
} 