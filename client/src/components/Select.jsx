import PropTypes from 'prop-types';
import styles from './input.module.css';

export default function Select({ label, error, id, children, ...props }) {
  return (
    <div className={styles.field}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <select id={id} className={[styles.input, error ? styles.hasError : ''].join(' ')} {...props}>
        {children}
      </select>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

Select.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  id: PropTypes.string,
  children: PropTypes.node,
};
