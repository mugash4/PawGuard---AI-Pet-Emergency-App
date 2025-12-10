import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import APIKeyManager from './APIKeyManager';
import UserManager from './UserManager';
import Analytics from './Analytics';

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('analytics');
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    aiQueriesToday: 0,
    revenue: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get total users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;
      const premiumUsers = usersSnapshot.docs.filter(
        (doc) => doc.data().isPremium === true
      ).length;

      // Get today's AI queries
      const today = new Date().toISOString().split('T')[0];
      const queriesSnapshot = await getDocs(collection(db, 'aiQueries'));
      const aiQueriesToday = queriesSnapshot.docs.filter(
        (doc) => doc.id.includes(today)
      ).length;

      setStats({
        totalUsers,
        premiumUsers,
        aiQueriesToday,
        revenue: premiumUsers * 7.99, // Simplified calculation
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>
          <h2 style={styles.logoText}>🐾 PawGuard Admin</h2>
        </div>
        <nav style={styles.nav}>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'analytics' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'apiKeys' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('apiKeys')}
          >
            🔑 API Keys
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'users' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'settings' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        </nav>
        <div style={styles.userInfo}>
          <p style={styles.userEmail}>{user.email}</p>
          <button style={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            {activeTab === 'analytics' && 'Analytics Dashboard'}
            {activeTab === 'apiKeys' && 'API Key Management'}
            {activeTab === 'users' && 'User Management'}
            {activeTab === 'settings' && 'App Settings'}
          </h1>
        </div>

        <div style={styles.content}>
          {activeTab === 'analytics' && (
            <Analytics stats={stats} onRefresh={loadStats} />
          )}
          {activeTab === 'apiKeys' && <APIKeyManager />}
          {activeTab === 'users' && <UserManager />}
          {activeTab === 'settings' && (
            <div style={styles.comingSoon}>
              <h2>⚙️ App Settings</h2>
              <p>Feature coming soon...</p>
              <ul style={styles.featureList}>
                <li>Ad configuration (AdMob settings)</li>
                <li>Content management (emergency guides, food database)</li>
                <li>Subscription pricing control</li>
                <li>App versioning and force update</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
  },
  logo: {
    padding: '24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoText: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
  },
  nav: {
    flex: 1,
    padding: '24px 12px',
  },
  navButton: {
    width: '100%',
    padding: '12px 16px',
    marginBottom: '8px',
    backgroundColor: 'transparent',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '15px',
    transition: 'background 0.2s',
  },
  navButtonActive: {
    backgroundColor: '#FF8C61',
  },
  userInfo: {
    padding: '24px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  userEmail: {
    margin: '0 0 12px 0',
    fontSize: '13px',
    opacity: 0.8,
  },
  logoutButton: {
    width: '100%',
    padding: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  main: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    overflow: 'auto',
  },
  header: {
    backgroundColor: '#fff',
    padding: '24px 32px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  content: {
    padding: '32px',
  },
  comingSoon: {
    backgroundColor: '#fff',
    padding: '48px',
    borderRadius: '12px',
    textAlign: 'center',
  },
  featureList: {
    textAlign: 'left',
    maxWidth: '500px',
    margin: '24px auto',
    lineHeight: '2',
  },
};
