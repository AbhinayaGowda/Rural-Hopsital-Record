import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import styles from './login-page.module.css';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/households', { replace: true });
    } catch (err) {
      setError(err.message ?? 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.icon}>🏥</span>
          <h1 className={styles.title}>Rural Health Records</h1>
          <p className={styles.sub}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />
          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" size="lg" loading={loading} style={{ width: '100%' }}>
            Sign in
          </Button>
        </form>

        <div className={styles.demoBox}>
          <p className={styles.demoTitle}>Demo accounts (password: Demo@2026)</p>
          {[
            ['admin@demo.health',   'Admin'],
            ['doctor@demo.health',  'Doctor'],
            ['doctor2@demo.health', 'Doctor 2'],
            ['staff@demo.health',   'Ground Staff'],
          ].map(([em, label]) => (
            <button
              key={em}
              type="button"
              className={styles.demoBtn}
              onClick={() => { setEmail(em); setPassword('Demo@2026'); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
