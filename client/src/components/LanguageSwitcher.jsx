import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हि' },
  { code: 'mr', label: 'म' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const change = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
  };

  return (
    <div style={{ display: 'flex', gap: 4, padding: '0 16px 8px' }}>
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => change(code)}
          style={{
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.15)',
            background: i18n.language === code ? 'rgba(255,255,255,0.15)' : 'transparent',
            color: i18n.language === code ? '#f1f5f9' : '#64748b',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
