import PropTypes from 'prop-types';
import styles from './button.module.css';

export default function Button({ children, variant = 'primary', size = 'md', loading, ...props }) {
  return (
    <button
      className={[styles.btn, styles[variant], styles[size]].join(' ')}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <span className={styles.spinner} /> : children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  loading: PropTypes.bool,
};
