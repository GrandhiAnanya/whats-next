import { useState } from 'react'
import { auth } from './firebase'
import { sendPasswordResetEmail } from 'firebase/auth'

function Profile({ user, onBack }) {
  const [resetStatus, setResetStatus] = useState('')  // 'sent' | 'error' | ''
  const [resetError, setResetError] = useState('')

  const initial =
    user?.displayName?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    '?'

  async function handlePasswordReset() {
    setResetStatus('')
    setResetError('')
    try {
      await sendPasswordResetEmail(auth, user.email)
      setResetStatus('sent')
    } catch (err) {
      setResetError(err.message)
    }
  }

  return (
    <div style={styles.page}>
      <button style={styles.backButton} onClick={onBack}>
        ← Back
      </button>

      {/* ── Avatar + identity ── */}
      <div style={styles.avatarSection}>
        {user?.photoURL ? (
          <img src={user.photoURL} alt="Profile" style={styles.avatarImage} />
        ) : (
          <div style={styles.avatarCircle}>{initial}</div>
        )}
        <h2 style={styles.displayName}>{user?.displayName || 'Reader'}</h2>
        <p style={styles.email}>{user?.email}</p>
      </div>

      {/* ── Change password card ── */}
      <div style={styles.card}>
        <h3 style={styles.cardHeading}>Change Password</h3>
        <p style={styles.cardDescription}>
          We'll send a reset link to your email address.
        </p>
        <button style={styles.resetButton} onClick={handlePasswordReset}>
          Send password reset email
        </button>
        {resetStatus === 'sent' && (
          <p style={styles.successMessage}>Reset email sent! Check your inbox.</p>
        )}
        {resetError && (
          <p style={styles.errorMessage}>{resetError}</p>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 32px',
    fontFamily: "'Lora', serif",
    color: '#3D3A36',
    background: 'transparent',
  },
  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6F5B47',
    fontFamily: "'Lora', serif",
    fontSize: '0.95rem',
    padding: '0',
    marginBottom: '32px',
    display: 'inline-block',
  },
  avatarSection: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  avatarImage: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    border: '2px solid #EADBCF',
    objectFit: 'cover',
    marginBottom: '16px',
  },
  avatarCircle: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#C9AE7C',
    border: '2px solid #EADBCF',
    color: '#fff',
    fontFamily: "'Playfair Display', serif",
    fontSize: '2.4rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  displayName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.8rem',
    fontWeight: '600',
    color: '#5F4C3B',
    margin: '0 0 6px',
  },
  email: {
    color: '#8B775E',
    fontSize: '0.95rem',
    margin: '0',
  },
  card: {
    background: '#FFFDF9',
    border: '1px solid #EADBCF',
    borderRadius: '16px',
    padding: '24px',
  },
  cardHeading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#5F4C3B',
    margin: '0 0 8px',
  },
  cardDescription: {
    color: '#8B775E',
    fontSize: '0.9rem',
    margin: '0 0 16px',
  },
  resetButton: {
    padding: '10px 20px',
    backgroundColor: '#6F5B47',
    color: '#fff',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontFamily: "'Lora', serif",
    fontSize: '0.9rem',
  },
  successMessage: {
    color: '#4a7c59',
    fontSize: '0.875rem',
    marginTop: '12px',
  },
  errorMessage: {
    color: '#b0413e',
    fontSize: '0.875rem',
    marginTop: '12px',
  },
}

export default Profile
