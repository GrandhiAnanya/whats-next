import { useState } from 'react'
import { auth } from './firebase'
import { sendPasswordResetEmail, updateProfile, updateEmail } from 'firebase/auth'

function Profile({ user, onBack }) {
  // Locally tracked committed values — user prop won't auto-update after profile edits
  const [currentName, setCurrentName] = useState(user?.displayName || '')
  const [currentEmail, setCurrentEmail] = useState(user?.email || '')

  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')

  const [resetStatus, setResetStatus] = useState('')
  const [resetError, setResetError] = useState('')

  const initial =
    currentName?.[0]?.toUpperCase() ||
    currentEmail?.[0]?.toUpperCase() ||
    '?'

  async function handleSaveName() {
    setNameError('')
    try {
      await updateProfile(auth.currentUser, { displayName: editName.trim() })
      setCurrentName(editName.trim())
      setEditingName(false)
    } catch (err) {
      setNameError(err.message)
    }
  }

  async function handleSaveEmail() {
    setEmailError('')
    try {
      await updateEmail(auth.currentUser, editEmail.trim())
      setCurrentEmail(editEmail.trim())
      setEditingEmail(false)
    } catch {
      setEmailError('Please sign out and sign back in before changing your email.')
    }
  }

  async function handlePasswordReset() {
    setResetStatus('')
    setResetError('')
    try {
      await sendPasswordResetEmail(auth, currentEmail)
      setResetStatus('sent')
    } catch (err) {
      setResetError(err.message)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.backRow}>
        <button style={styles.backButton} onClick={onBack}>← Back</button>
      </div>

      <div style={styles.cardWrapper}>
        {/* Left decorative vine */}
        <svg style={styles.vineLeft} width="50" height="320" viewBox="0 0 50 320" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 25 0 Q 5 40 25 80 Q 45 120 25 160 Q 5 200 25 240 Q 45 280 25 320" stroke="#C9AE7C" strokeWidth="1.5" fill="none"/>
          <circle cx="14" cy="40" r="3" fill="#C9AE7C"/>
          <circle cx="36" cy="80" r="3" fill="#C9AE7C"/>
          <circle cx="14" cy="120" r="3" fill="#C9AE7C"/>
          <circle cx="36" cy="160" r="3" fill="#C9AE7C"/>
          <circle cx="14" cy="200" r="3" fill="#C9AE7C"/>
          <circle cx="36" cy="240" r="3" fill="#C9AE7C"/>
          <circle cx="14" cy="280" r="3" fill="#C9AE7C"/>
        </svg>

        <div style={styles.card}>
          {/* Avatar */}
          <div style={styles.avatarSection}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" style={styles.avatarImage} />
            ) : (
              <div style={styles.avatarCircle}>{initial}</div>
            )}
          </div>

          {/* Display name */}
          {editingName ? (
            <div style={styles.editRow}>
              <input
                style={styles.editInput}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
              />
              <button style={styles.iconButton} onClick={handleSaveName} title="Save">✓</button>
              <button style={styles.iconButton} onClick={() => { setEditingName(false); setNameError('') }} title="Cancel">✕</button>
            </div>
          ) : (
            <div style={styles.fieldRow}>
              <h2 style={styles.displayName}>{currentName || 'Reader'}</h2>
              <button style={styles.editIcon} onClick={() => { setEditName(currentName); setEditingName(true) }} title="Edit name">✎</button>
            </div>
          )}
          {nameError && <p style={styles.errorMessage}>{nameError}</p>}

          {/* Email */}
          {editingEmail ? (
            <div style={styles.editRow}>
              <input
                style={styles.editInput}
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEmail()}
              />
              <button style={styles.iconButton} onClick={handleSaveEmail} title="Save">✓</button>
              <button style={styles.iconButton} onClick={() => { setEditingEmail(false); setEmailError('') }} title="Cancel">✕</button>
            </div>
          ) : (
            <div style={styles.fieldRow}>
              <p style={styles.email}>{currentEmail}</p>
              <button style={styles.editIcon} onClick={() => { setEditEmail(currentEmail); setEditingEmail(true) }} title="Edit email">✎</button>
            </div>
          )}
          {emailError && <p style={{ ...styles.errorMessage, marginBottom: '8px' }}>{emailError}</p>}

          <div style={styles.divider} />

          {/* Change password */}
          <div>
            <h3 style={styles.cardHeading}>Change Password</h3>
            <button style={styles.resetButton} onClick={handlePasswordReset}>
              Send password reset email
            </button>
            {(resetStatus === 'sent' || resetError) && (
              <p style={styles.cardDescription}>We'll send a reset link to your email address.</p>
            )}
            {resetStatus === 'sent' && (
              <p style={styles.successMessage}>Reset email sent! Check your inbox.</p>
            )}
            {resetError && (
              <p style={styles.errorMessage}>{resetError}</p>
            )}
          </div>
        </div>

        {/* Right decorative vine (mirror of left) */}
        <svg style={styles.vineRight} width="50" height="320" viewBox="0 0 50 320" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 25 0 Q 45 40 25 80 Q 5 120 25 160 Q 45 200 25 240 Q 5 280 25 320" stroke="#C9AE7C" strokeWidth="1.5" fill="none"/>
          <circle cx="36" cy="40" r="3" fill="#C9AE7C"/>
          <circle cx="14" cy="80" r="3" fill="#C9AE7C"/>
          <circle cx="36" cy="120" r="3" fill="#C9AE7C"/>
          <circle cx="14" cy="160" r="3" fill="#C9AE7C"/>
          <circle cx="36" cy="200" r="3" fill="#C9AE7C"/>
          <circle cx="14" cy="240" r="3" fill="#C9AE7C"/>
          <circle cx="36" cy="280" r="3" fill="#C9AE7C"/>
        </svg>
      </div>
    </div>
  )
}

const styles = {
  page: {
    width: '100%',
    maxWidth: '700px',
    margin: '0 auto',
    padding: '40px 32px',
    boxSizing: 'border-box',
    fontFamily: "'Lora', serif",
    color: '#3D3A36',
  },
  backRow: {
    marginBottom: '32px',
    textAlign: 'left',
  },
  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6F5B47',
    fontFamily: "'Lora', serif",
    fontSize: '0.95rem',
    padding: '0',
    display: 'inline-block',
  },
  cardWrapper: {
    position: 'relative',
    maxWidth: '480px',
    margin: '0 auto',
  },
  vineLeft: {
    position: 'absolute',
    left: '-58px',
    top: '24px',
    opacity: 0.4,
    pointerEvents: 'none',
  },
  vineRight: {
    position: 'absolute',
    right: '-58px',
    top: '24px',
    opacity: 0.4,
    pointerEvents: 'none',
  },
  card: {
    background: '#FFFDF9',
    border: '1px solid #EADBCF',
    borderRadius: '20px',
    padding: '48px',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
  },
  avatarSection: {
    marginBottom: '20px',
  },
  avatarImage: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    border: '2px solid #EADBCF',
    objectFit: 'cover',
    display: 'block',
    margin: '0 auto',
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
    margin: '0 auto',
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  editRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginBottom: '4px',
  },
  displayName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.8rem',
    fontWeight: '600',
    color: '#5F4C3B',
    margin: '0',
  },
  email: {
    color: '#8B775E',
    fontSize: '0.95rem',
    margin: '0',
  },
  editIcon: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#C9AE7C',
    fontSize: '1rem',
    padding: '2px 4px',
    lineHeight: 1,
    flexShrink: 0,
  },
  editInput: {
    flex: 1,
    maxWidth: '220px',
    padding: '6px 14px',
    fontSize: '1rem',
    border: '1px solid #EADBCF',
    borderRadius: '50px',
    fontFamily: "'Lora', serif",
    color: '#3D3A36',
    outline: 'none',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
  iconButton: {
    background: 'none',
    border: '1px solid #EADBCF',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    color: '#6F5B47',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    flexShrink: 0,
  },
  divider: {
    borderTop: '1px solid #EADBCF',
    margin: '24px 0',
  },
  cardHeading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#5F4C3B',
    margin: '0 0 12px',
  },
  cardDescription: {
    color: '#8B775E',
    fontSize: '0.9rem',
    margin: '10px 0 0',
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
    marginTop: '8px',
  },
  errorMessage: {
    color: '#b0413e',
    fontSize: '0.875rem',
    marginTop: '8px',
  },
}

export default Profile
