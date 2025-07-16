import { FiUser } from 'react-icons/fi';
import styles from './AccountButton.module.scss';

export default function AccountAvatar() {
  return <span className={styles.avatar}><FiUser /></span>;
} 