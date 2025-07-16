import styles from './AccountButton.module.scss';

export default function AccountName({ name }: { name?: string }) {
  return <span className={styles.name}>{name || 'Аккаунт'}</span>;
} 