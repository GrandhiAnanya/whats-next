import { useState, useEffect } from 'react'
import { db } from './firebase'
import { collection, getDocs, setDoc, doc } from 'firebase/firestore'

function BookCard({ book, onSave, isSaved }) {
  return (
    <div style={styles.card}>
      {book.thumbnail ? (
        <img src={book.thumbnail} alt={book.title} style={styles.thumbnail} />
      ) : (
        <div style={styles.thumbnailPlaceholder}>No Cover</div>
      )}
      <div style={styles.cardBody}>
        <p style={styles.cardTitle}>{book.title}</p>
        <p style={styles.cardMeta}>{book.authors}</p>
        <p style={styles.cardMeta}>{book.categories}</p>
        <button
          style={isSaved ? styles.savedButton : styles.saveButton}
          onClick={onSave}
          disabled={isSaved}
        >
          {isSaved ? 'Saved ✓' : 'Save to Library'}
        </button>
      </div>
    </div>
  )
}

export default function WhatsNext({ user, onBack }) {
  const [readBooks, setReadBooks] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [library, setLibrary] = useState([])

  useEffect(() => {
    async function load() {
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'library'))
      const allBooks = snapshot.docs.map((d) => d.data())
      setLibrary(allBooks)

      const read = allBooks.filter((b) => b.status === 'read')
      setReadBooks(read)

      if (read.length === 0) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch('http://localhost:8000/recommendations-from-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titles: read.map((b) => b.title) }),
        })
        const data = await res.json()
        setRecommendations(data)
      } catch {
        setError('Could not reach the server. Make sure the backend is running.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.uid])

  async function saveBook(book) {
    const bookDoc = doc(db, 'users', user.uid, 'library', book.title)
    const bookData = {
      title: book.title,
      authors: book.authors,
      categories: book.categories,
      thumbnail: book.thumbnail || null,
      status: 'want_to_read',
      rating: null,
      addedAt: new Date(),
    }
    await setDoc(bookDoc, bookData)
    setLibrary((prev) => [...prev, bookData])
  }

  function buildSubheading() {
    const shown = readBooks.slice(0, 3).map((b) => b.title)
    const extra = readBooks.length - 3
    const base = shown.join(', ')
    return extra > 0 ? `${base}, and ${extra} more` : base
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>← Back</button>
        <h1 style={styles.heading}>What's Next?</h1>
      </div>

      <main style={styles.main}>
        {loading && (
          <p style={styles.feedback}>
            Finding your next read based on {readBooks.length} book{readBooks.length !== 1 ? 's' : ''}...
          </p>
        )}

        {!loading && readBooks.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              Add some books to your Read shelf first, and we'll recommend what to read next!
            </p>
            <p style={styles.emptyHint}>Visit My Library to mark books as "Read".</p>
            <button style={styles.primaryButton} onClick={onBack}>← Go back</button>
          </div>
        )}

        {error && <p style={{ ...styles.feedback, color: '#b0413e' }}>{error}</p>}

        {!loading && !error && recommendations.length === 0 && readBooks.length > 0 && (
          <p style={styles.feedback}>
            We couldn't match your read books to our dataset yet. Try adding more titles!
          </p>
        )}

        {!loading && recommendations.length > 0 && (
          <div>
            <h2 style={styles.resultsHeading}>
              because you've read {buildSubheading()}
            </h2>
            <div style={styles.grid}>
              {recommendations.map((book, i) => (
                <BookCard
                  key={i}
                  book={book}
                  isSaved={library.some((b) => b.title === book.title)}
                  onSave={() => saveBook(book)}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    fontFamily: "'Lora', serif",
    color: '#3D3A36',
    background: 'transparent',
    position: 'relative',
    zIndex: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '22px 48px',
    borderBottom: '1px solid #EADBCF',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  heading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '2rem',
    fontWeight: '600',
    color: '#5F4C3B',
    margin: 0,
    textTransform: 'lowercase',
  },
  backButton: {
    padding: '8px 16px',
    fontSize: '0.85rem',
    backgroundColor: 'transparent',
    color: '#6F5B47',
    border: '1px solid #EADBCF',
    borderRadius: '50px',
    cursor: 'pointer',
    fontFamily: "'Lora', serif",
    whiteSpace: 'nowrap',
  },
  main: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '48px',
  },
  feedback: {
    textAlign: 'center',
    color: '#8B775E',
    fontSize: '1rem',
    fontStyle: 'italic',
    margin: '40px 0',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 24px',
  },
  emptyText: {
    color: '#5F4C3B',
    fontSize: '1.1rem',
    marginBottom: '12px',
  },
  emptyHint: {
    color: '#8B775E',
    fontSize: '0.95rem',
    fontStyle: 'italic',
    marginBottom: '32px',
  },
  primaryButton: {
    padding: '10px 24px',
    fontSize: '0.9rem',
    backgroundColor: '#6F5B47',
    color: '#fff',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontFamily: "'Lora', serif",
  },
  resultsHeading: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: '#5F4C3B',
    borderLeft: '4px solid #C9AE7C',
    paddingLeft: '12px',
    textTransform: 'lowercase',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#FFFDF9',
    border: '1px solid #EADBCF',
    borderRadius: '16px',
    overflow: 'hidden',
    textAlign: 'left',
  },
  thumbnail: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '200px',
    backgroundColor: '#F5EBD9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: '0.85rem',
  },
  cardBody: {
    padding: '12px',
  },
  cardTitle: {
    fontWeight: '500',
    fontSize: '0.95rem',
    marginBottom: '4px',
    color: '#3D3A36',
  },
  cardMeta: {
    fontSize: '0.8rem',
    color: '#8B775E',
    margin: '2px 0',
  },
  saveButton: {
    marginTop: '10px',
    padding: '6px 14px',
    fontSize: '0.78rem',
    backgroundColor: '#6F5B47',
    color: '#fff',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontFamily: "'Lora', serif",
  },
  savedButton: {
    marginTop: '10px',
    padding: '6px 14px',
    fontSize: '0.78rem',
    backgroundColor: 'transparent',
    color: '#8B775E',
    border: '1px solid #EADBCF',
    borderRadius: '50px',
    cursor: 'default',
    fontFamily: "'Lora', serif",
  },
}
