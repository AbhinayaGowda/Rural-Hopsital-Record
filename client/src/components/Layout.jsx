import { NavLink, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../hooks/useAuth.js';
import { useRole } from '../hooks/useRole.js';
import { fmtRole } from '../utils/format.js';
import styles from './layout.module.css';

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🏥</span>
          <span className={styles.brandText}>RuralHealth</span>
        </div>

        <nav className={styles.nav}>
          <NavLink to="/households" className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}>
            <span className={styles.icon}>🏠</span> Households
          </NavLink>
          <NavLink to="/notifications" className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}>
            <span className={styles.icon}>🔔</span> Notifications
          </NavLink>
          {isAdmin && (
            <NavLink to="/audit-logs" className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}>
              <span className={styles.icon}>📋</span> Audit Logs
            </NavLink>
          )}
        </nav>

        <div className={styles.userCard}>
          <div className={styles.userName}>{profile?.full_name ?? '…'}</div>
          <div className={styles.userRole}>{fmtRole(profile?.role)}</div>
          <button className={styles.signOut} onClick={handleSignOut}>Sign out</button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}

Layout.propTypes = { children: PropTypes.node };
