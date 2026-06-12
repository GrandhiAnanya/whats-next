import { useState } from 'react'
import { auth } from './firebase'
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'

// ── Auth component ────────────────────────────────────────────────────────────
// Handles sign-up, sign-in (email/password), and Google sign-in
function Auth() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)  // true = sign-up form, false = sign-in form
  const [error, setError]       = useState('')

  // ── Google sign-in ─────────────────────────────────────────────────────────
  // GoogleAuthProvider tells Firebase we want to use Google as the identity provider
  // signInWithPopup opens a Google login popup; on success Firebase handles the session
  async function handleGoogleSignIn() {
    setError('')
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Email / password submit ────────────────────────────────────────────────
  // createUserWithEmailAndPassword creates a new account (sign-up)
  // signInWithEmailAndPassword checks credentials against existing accounts (sign-in)
  async function handleSubmit(e) {
    e.preventDefault()  // prevent the browser from reloading the page on form submit
    setError('')
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      // Firebase error messages are readable (e.g. "auth/wrong-password") — display them directly
      setError(err.message)
    }
  }

  // ── Sign out ───────────────────────────────────────────────────────────────
  async function handleSignOut() {
    await signOut(auth)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
    <div style={styles.container}>
      <h2 style={styles.heading}>{isSignUp ? 'Create an Account' : 'Welcome Back'}</h2>
      <p style={styles.subheading}>{isSignUp ? 'Join to save your library.' : 'Sign in to your library.'}</p>

      {/* ── Google sign-in button ── */}
      <button style={styles.googleButton} onClick={handleGoogleSignIn}>
        Continue with Google
      </button>

      {/* ── Divider ── */}
      <div style={styles.divider}>
        <hr style={styles.dividerLine} />
        <span style={styles.dividerText}>or</span>
        <hr style={styles.dividerLine} />
      </div>

      {/* ── Email / password form ── */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={styles.input}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" style={styles.submitButton}>
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>

      {/* ── Error message ── */}
      {error && <p style={styles.error}>{error}</p>}

      {/* ── Toggle between sign-up and sign-in ── */}
      <p style={styles.toggleText}>
        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
        <button style={styles.toggleButton} onClick={() => { setIsSignUp(!isSignUp); setError('') }}>
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
  },
  
  container: {
    maxWidth: '560px',
    width: '90%',
    margin: '40px auto',
    padding: '60px 56px',
    background: 'rgba(255,253,249,0.95)',
    border: '1px solid #EADBCF',
    borderRadius: '16px',
    fontFamily: "'Lora', serif",
    color: '#3D3A36',
    textAlign: 'center',
  },
  heading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '2rem',
    fontWeight: '600',
    color: '#5F4C3B',
    marginBottom: '6px',
  },
  subheading: {
    fontStyle: 'italic',
    color: '#8B775E',
    marginBottom: '28px',
    fontSize: '0.95rem',
  },
  googleButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #EADBCF',
    borderRadius: '50px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    color: '#6F5B47',
    fontFamily: "'Lora', serif",
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    border: 'none',
    borderTop: '1px solid #EADBCF',
  },
  dividerText: {
    color: '#8B775E',
    fontSize: '0.85rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    padding: '10px 16px',
    fontSize: '0.85rem',
    border: '1px solid #EADBCF',
    borderRadius: '50px',
    outline: 'none',
    fontFamily: "'Lora', serif",
    color: '#6F5B47',
    backgroundColor: '#fff',
  },
  submitButton: {
    padding: '12px',
    backgroundColor: '#6F5B47',
    color: '#fff',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontFamily: "'Lora', serif",
    marginTop: '4px',
  },
  error: {
    color: '#b0413e',
    fontSize: '0.85rem',
    marginTop: '12px',
  },
  toggleText: {
    marginTop: '20px',
    fontSize: '0.875rem',
    color: '#8B775E',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#6F5B47',
    cursor: 'pointer',
    fontFamily: "'Lora', serif",
    fontSize: '0.875rem',
    textDecoration: 'underline',
    padding: 0,
  },
}

export default Auth
