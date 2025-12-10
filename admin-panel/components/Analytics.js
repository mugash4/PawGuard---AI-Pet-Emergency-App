export default function Analytics({ stats, onRefresh }) {
  return (
    <div>
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👥</div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Total Users</p>
            <h2 style={styles.statValue}>{stats.totalUsers}</h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>⭐</div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Premium Users</p>
            <h2 style={styles.statValue}>{stats.premiumUsers}</h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🤖</div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>AI Queries Today</p>
            <h2 style={styles.statValue}>{stats.aiQueriesToday}</h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Est. Monthly Revenue</p>
            <h2 style={styles.statValue}>${stats.revenue.toFixed(2)}</h2>
          </div>
        </div>
      </div>

      <button onClick={onRefresh} style={styles.refreshButton}>
        🔄 Refresh Data
      </button>

      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>📊 Analytics Overview</h3>
        <p>
          Real-time analytics showing key metrics for your PawGuard app. Premium users
          are calculated based on active subscriptions. Revenue estimates are based on
          yearly subscription pricing ($7.99/year).
        </p>
      </div>
    </div>
  );
}

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  statIcon: {
    fontSize: '40px',
    marginRight: '20px',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#666',
    fontWeight: '500',
  },
  statValue: {
    margin: 0,
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a2e',
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
    marginBottom: '32px',
  },
  infoBox: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  infoTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
};
