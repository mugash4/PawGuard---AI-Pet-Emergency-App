import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePremium = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isPremium: !currentStatus,
      });
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user status');
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div style={styles.loading}>Loading users...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <input
          type="text"
          placeholder="Search by email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <button onClick={loadUsers} style={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Premium</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} style={styles.tr}>
                <td style={styles.td}>{user.email || 'N/A'}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.badge,
                      ...(user.role === 'admin' ? styles.badgeAdmin : styles.badgeUser),
                    }}
                  >
                    {user.role || 'user'}
                  </span>
                </td>
                <td style={styles.td}>
                  {user.isPremium ? (
                    <span style={{ ...styles.badge, ...styles.badgePremium }}>Premium</span>
                  ) : (
                    <span style={{ ...styles.badge, ...styles.badgeFree }}>Free</span>
                  )}
                </td>
                <td style={styles.td}>
                  {user.createdAt
                    ? new Date(user.createdAt.seconds * 1000).toLocaleDateString()
                    : 'N/A'}
                </td>
                <td style={styles.td}>
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => togglePremium(user.id, user.isPremium)}
                      style={styles.actionButton}
                    >
                      {user.isPremium ? 'Remove Premium' : 'Grant Premium'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.summary}>
        <p>
          Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  searchInput: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
  },
  refreshButton: {
    padding: '12px 24px',
    backgroundColor: '#FF8C61',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    fontWeight: '600',
    fontSize: '14px',
    color: '#333',
    borderBottom: '2px solid #e0e0e0',
  },
  tr: {
    borderBottom: '1px solid #e0e0e0',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#666',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  badgeAdmin: {
    backgroundColor: '#fee',
    color: '#c33',
  },
  badgeUser: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  badgePremium: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  badgeFree: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  actionButton: {
    padding: '6px 16px',
    backgroundColor: '#FF8C61',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  summary: {
    marginTop: '16px',
    textAlign: 'center',
    color: '#666',
    fontSize: '14px',
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#999',
  },
};
