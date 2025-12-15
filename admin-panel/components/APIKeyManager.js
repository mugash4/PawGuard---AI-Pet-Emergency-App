import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'pawguard-super-secret-key-2024'; // In production, use environment variable

export default function APIKeyManager() {
  const [apiKeys, setApiKeys] = useState({
    deepseek: '',
    openai: '',
    openrouter: '',
    admob: '',
  });
  const [showKeys, setShowKeys] = useState({
    deepseek: false,
    openai: false,
    openrouter: false,
    admob: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      const docRef = doc(db, 'config', 'apiKeys');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const encryptedKeys = docSnap.data();
        const decryptedKeys = {};
        
        for (const [key, value] of Object.entries(encryptedKeys)) {
          if (value) {
            try {
              const bytes = CryptoJS.AES.decrypt(value, ENCRYPTION_KEY);
              decryptedKeys[key] = bytes.toString(CryptoJS.enc.Utf8);
            } catch (e) {
              decryptedKeys[key] = '';
            }
          } else {
            decryptedKeys[key] = '';
          }
        }
        
        setApiKeys(prev => ({
          ...prev,
          ...decryptedKeys
        }));
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
      showMessage('Error loading API keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const encryptedKeys = {};
      
      for (const [key, value] of Object.entries(apiKeys)) {
        if (value) {
          encryptedKeys[key] = CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
        } else {
          encryptedKeys[key] = '';
        }
      }

      await setDoc(doc(db, 'config', 'apiKeys'), encryptedKeys);
      showMessage('API keys saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving API keys:', error);
      showMessage('Error saving API keys: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (msg, type) => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 5000);
  };

  const toggleVisibility = (keyName) => {
    setShowKeys((prev) => ({
      ...prev,
      [keyName]: !prev[keyName],
    }));
  };

  if (loading) {
    return <div style={styles.loading}>Loading API keys...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🔑 API Key Configuration</h2>
        <p style={styles.description}>
          Configure API keys for AI services. Keys are encrypted and stored securely in Firestore.
          They are only accessible via backend Cloud Functions and never exposed to the mobile app.
        </p>

        {message && (
          <div
            style={{
              ...styles.message,
              ...(message.type === 'success' ? styles.messageSuccess : styles.messageError),
            }}
          >
            {message.text}
          </div>
        )}

        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>🤖 AI Service API Keys</h3>
          <p style={styles.sectionDescription}>
            Configure at least one AI service. The app will use them in this priority order: DeepSeek → OpenRouter → OpenAI
          </p>
        </div>

        {/* DeepSeek API Key */}
        <div style={styles.keySection}>
          <label style={styles.label}>
            DeepSeek API Key
            <span style={styles.labelHelper}> (Recommended - Most cost-effective)</span>
          </label>
          <div style={styles.inputGroup}>
            <input
              type={showKeys.deepseek ? 'text' : 'password'}
              value={apiKeys.deepseek}
              onChange={(e) => setApiKeys({ ...apiKeys, deepseek: e.target.value })}
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              style={styles.input}
            />
            <button
              onClick={() => toggleVisibility('deepseek')}
              style={styles.toggleButton}
            >
              {showKeys.deepseek ? '🙈 Hide' : '👁️ Show'}
            </button>
          </div>
          <p style={styles.helper}>
            Get your API key from:{' '}
            <a
              href="https://platform.deepseek.com/api_keys"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            >
              DeepSeek Platform
            </a>
            {' '}• Model: deepseek-chat • Cost: $0.14 per 1M tokens
          </p>
        </div>

        {/* OpenAI API Key */}
        <div style={styles.keySection}>
          <label style={styles.label}>
            OpenAI API Key
            <span style={styles.labelHelper}> (Optional - Premium quality)</span>
          </label>
          <div style={styles.inputGroup}>
            <input
              type={showKeys.openai ? 'text' : 'password'}
              value={apiKeys.openai}
              onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              style={styles.input}
            />
            <button
              onClick={() => toggleVisibility('openai')}
              style={styles.toggleButton}
            >
              {showKeys.openai ? '🙈 Hide' : '👁️ Show'}
            </button>
          </div>
          <p style={styles.helper}>
            Get your API key from:{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            >
              OpenAI Platform
            </a>
            {' '}• Model: gpt-4o-mini • Cost: $0.15 per 1M input tokens
          </p>
        </div>

        {/* OpenRouter API Key */}
        <div style={styles.keySection}>
          <label style={styles.label}>
            OpenRouter API Key
            <span style={styles.labelHelper}> (Optional - Access 100+ models)</span>
          </label>
          <div style={styles.inputGroup}>
            <input
              type={showKeys.openrouter ? 'text' : 'password'}
              value={apiKeys.openrouter}
              onChange={(e) => setApiKeys({ ...apiKeys, openrouter: e.target.value })}
              placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              style={styles.input}
            />
            <button
              onClick={() => toggleVisibility('openrouter')}
              style={styles.toggleButton}
            >
              {showKeys.openrouter ? '🙈 Hide' : '👁️ Show'}
            </button>
          </div>
          <p style={styles.helper}>
            Get your API key from:{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            >
              OpenRouter Platform
            </a>
            {' '}• Model: claude-3-haiku • Flexible pricing
          </p>
        </div>

        <div style={styles.divider}></div>

        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>📱 Other Services</h3>
        </div>

        {/* AdMob App ID */}
        <div style={styles.keySection}>
          <label style={styles.label}>
            AdMob App ID
            <span style={styles.labelHelper}> (Optional - for ads)</span>
          </label>
          <div style={styles.inputGroup}>
            <input
              type={showKeys.admob ? 'text' : 'password'}
              value={apiKeys.admob}
              onChange={(e) => setApiKeys({ ...apiKeys, admob: e.target.value })}
              placeholder="ca-app-pub-xxxxxxxxxxxxxxxx~xxxxxxxxxx"
              style={styles.input}
            />
            <button
              onClick={() => toggleVisibility('admob')}
              style={styles.toggleButton}
            >
              {showKeys.admob ? '🙈 Hide' : '👁️ Show'}
            </button>
          </div>
          <p style={styles.helper}>
            Get your AdMob App ID from:{' '}
            <a
              href="https://apps.admob.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            >
              AdMob Console
            </a>
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.saveButton,
            ...(saving ? styles.saveButtonDisabled : {}),
          }}
        >
          {saving ? 'Saving...' : '💾 Save API Keys'}
        </button>

        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>ℹ️ Security Information</h3>
          <ul style={styles.infoList}>
            <li>API keys are encrypted using AES-256 before storage</li>
            <li>Keys are stored in Firestore, never in app code</li>
            <li>Only the mobile app's AI service can decrypt and use these keys</li>
            <li>Mobile app retrieves encrypted keys and decrypts them client-side</li>
            <li>Priority: DeepSeek (cheapest) → OpenRouter → OpenAI</li>
            <li>Configure at least one AI service key for the app to function</li>
          </ul>
        </div>

        <div style={styles.warningBox}>
          <h3 style={styles.warningTitle}>⚠️ Important Notes</h3>
          <ul style={styles.infoList}>
            <li><strong>At least one AI key required:</strong> DeepSeek, OpenAI, or OpenRouter must be configured</li>
            <li><strong>Key format:</strong> Ensure keys start with "sk-" (OpenAI/DeepSeek) or "sk-or-v1-" (OpenRouter)</li>
            <li><strong>Testing:</strong> After saving, test AI features in the mobile app (Food Checker, AI Chat)</li>
            <li><strong>Costs:</strong> Monitor your API usage on respective platforms to avoid unexpected charges</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
  },
  card: {
    backgroundColor: '#fff',
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    margin: '0 0 16px 0',
    fontSize: '24px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  description: {
    margin: '0 0 32px 0',
    color: '#666',
    lineHeight: '1.6',
  },
  sectionHeader: {
    marginBottom: '24px',
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  sectionDescription: {
    margin: 0,
    fontSize: '14px',
    color: '#666',
  },
  divider: {
    height: '1px',
    backgroundColor: '#e0e0e0',
    margin: '32px 0',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  messageSuccess: {
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
  },
  messageError: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
  },
  keySection: {
    marginBottom: '28px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#333',
  },
  labelHelper: {
    fontWeight: '400',
    color: '#999',
    fontSize: '13px',
  },
  inputGroup: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontFamily: 'monospace',
    transition: 'border-color 0.2s',
  },
  toggleButton: {
    padding: '12px 20px',
    backgroundColor: '#f5f5f5',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  helper: {
    margin: '8px 0 0 0',
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.6',
  },
  link: {
    color: '#FF8C61',
    textDecoration: 'none',
    fontWeight: '500',
  },
  saveButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#FF8C61',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginTop: '8px',
  },
  saveButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  infoBox: {
    marginTop: '32px',
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  warningBox: {
    marginTop: '16px',
    padding: '24px',
    backgroundColor: '#fff3cd',
    borderRadius: '8px',
    border: '1px solid #ffc107',
  },
  infoTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
  },
  warningTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#856404',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    lineHeight: '1.8',
    color: '#666',
    fontSize: '14px',
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#999',
  },
};
