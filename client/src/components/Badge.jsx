import PropTypes from 'prop-types';
import styles from './badge.module.css';

export default function Badge({ children, color = 'gray' }) {
  return <span className={[styles.badge, styles[color]].join(' ')}>{children}</span>;
}

Badge.propTypes = {
  children: PropTypes.node,
  color: PropTypes.oneOf(['green', 'yellow', 'red', 'gray', 'blue']),
};
