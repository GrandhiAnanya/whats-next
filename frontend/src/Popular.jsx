import { useState, useEffect } from 'react'
import { useIsMobile } from './useIsMobile'
import { db } from './firebase'
import { collectionGroup, getDocs, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'

function PopularCard({ book, savedBooks, onSave }) {
  const isSaved = savedBooks.includes(book.title)
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
        <div style={styles.cardFooter}>
          <span style={styles.saveBadge}>Saved by {book.count} reader{book.count !== 1 ? 's' : ''}</span>
          {book.avgRating && (
            <span style={styles.rating}>★ {book.avgRating}</span>
          )}
        </div>
        {isSaved ? (
          <button style={styles.savedButton} disabled>Saved ✓</button>
        ) : (
          <div style={styles.buttonRow}>
            <button style={styles.actionButton} onClick={() => onSave(book, 'read')}>Mark as Read</button>
            <button style={styles.actionButton} onClick={() => onSave(book, 'want_to_read')}>Want to Read</button>
          </div>
        )}
      </div>
    </div>
  )
}

function RatedCard({ book, savedBooks, onSave }) {
  const isSaved = savedBooks.includes(book.title)
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
        <div style={styles.cardFooter}>
          <span style={styles.ratedBadge}>Rated by {book.ratingCount} reader{book.ratingCount !== 1 ? 's' : ''}</span>
          <span style={styles.rating}>★ {book.avgRating}</span>
        </div>
        {isSaved ? (
          <button style={styles.savedButton} disabled>Saved ✓</button>
        ) : (
          <div style={styles.buttonRow}>
            <button style={styles.actionButton} onClick={() => onSave(book, 'read')}>Mark as Read</button>
            <button style={styles.actionButton} onClick={() => onSave(book, 'want_to_read')}>Want to Read</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Popular({ user, onBack }) {
  const isMobile = useIsMobile()
  const [popular, setPopular] = useState([])
  const [highlyRated, setHighlyRated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedBooks, setSavedBooks] = useState([])

  useEffect(() => {
    async function load() {
      try {
        // collectionGroup queries every "library" subcollection across all users
        const snapshot = await getDocs(collectionGroup(db, 'library'))

        const bookMap = {}
        const ratingMap = {}
        snapshot.forEach((docSnap) => {
          const data = docSnap.data()
          if (!data.title) return
          if (!bookMap[data.title]) {
            bookMap[data.title] = {
              title: data.title,
              authors: data.authors || '',
              categories: data.categories || null,
              thumbnail: data.thumbnail || null,
              count: 0,
              ratings: [],
            }
          }
          bookMap[data.title].count++
          if (data.rating != null) {
            bookMap[data.title].ratings.push(data.rating)
          }
          if (data.rating != null ) {
            if (!ratingMap[data.title]) {
              ratingMap[data.title] = {
                title: data.title,
                authors: data.authors || '',
                categories: data.categories || null,
                thumbnail: data.thumbnail || null,
                ratings: [],
              }
            }
            ratingMap[data.title].ratings.push(data.rating)
          }
        })

        const sorted = Object.values(bookMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 12)
          .map((b) => ({
            ...b,
            avgRating:
              b.ratings.length > 0
                ? (b.ratings.reduce((sum, r) => sum + r, 0) / b.ratings.length).toFixed(1)
                : null,
          }))

        setPopular(sorted)

        const sortedRated = Object.values(ratingMap)
          .map((b) => ({
            ...b,
            avgRating: (b.ratings.reduce((sum, r) => sum + r, 0) / b.ratings.length).toFixed(1),
            ratingCount: b.ratings.length,
          }))
          .sort((a, b) => {
            const diff = parseFloat(b.avgRating) - parseFloat(a.avgRating)
            if (diff !== 0) return diff
            return b.ratingCount - a.ratingCount
          })
          .slice(0, 12)
        setHighlyRated(sortedRated)
      } catch (e) {
        setError('Could not load popular books.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!user?.uid) return
    async function fetchSaved() {
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'library'))
      setSavedBooks(snapshot.docs.map((d) => d.data().title))
    }
    fetchSaved()
  }, [user?.uid])

  async function saveBook(book, status) {
    const bookDoc = doc(db, 'users', user.uid, 'library', book.title)
    await setDoc(bookDoc, {
      title: book.title,
      authors: book.authors,
      thumbnail: book.thumbnail || null,
      categories: book.categories || null,
      status,
      rating: null,
      addedAt: serverTimestamp(),
    })
    setSavedBooks((prev) => [...prev, book.title])
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.header, padding: isMobile ? '14px 20px' : '22px 48px' }}>
        <button style={styles.backButton} onClick={onBack}>← Back</button>
        <h1 style={styles.heading}>Popular</h1>
      </div>

      <main style={{ ...styles.main, padding: isMobile ? '24px 20px' : '48px' }}>
        {loading && <p style={styles.feedback}>Finding popular books...</p>}

        {!loading && (error || popular.length === 0) && (
          <p style={styles.feedback}>
            No popular books yet — be the first to add some to your library!
          </p>
        )}

        {!loading && popular.length > 0 && (
          <div>
            <h2 style={styles.resultsHeading}>most saved across all readers</h2>
            <div style={styles.grid}>
              {popular.map((book, i) => (
                <PopularCard key={i} book={book} savedBooks={savedBooks} onSave={saveBook} />
              ))}
            </div>
          </div>
        )}

        {!loading && (
          <div style={{ marginTop: '56px' }}>
            <h2 style={styles.resultsHeading}>highly rated by readers</h2>
            {highlyRated.length === 0 ? (
              <p style={styles.feedback}>
                No ratings yet — be the first to rate a book in your library!
              </p>
            ) : (
              <div style={styles.grid}>
                {highlyRated.map((book, i) => (
                  <RatedCard key={i} book={book} savedBooks={savedBooks} onSave={saveBook} />
                ))}
              </div>
            )}
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
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
    fontSize: '0.82rem',
    marginBottom: '4px',
    color: '#3D3A36',
  },
  cardMeta: {
    fontSize: '0.75rem',
    color: '#8B775E',
    margin: '2px 0',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '10px',
    flexWrap: 'wrap',
    gap: '6px',
  },
  saveBadge: {
    fontSize: '0.75rem',
    color: '#6F5B47',
    backgroundColor: '#F5EBD9',
    border: '1px solid #EADBCF',
    borderRadius: '20px',
    padding: '3px 10px',
    fontFamily: "'Lora', serif",
  },
  ratedBadge: {
    fontSize: '0.75rem',
    color: '#4A6B5F',
    backgroundColor: '#EDF5F2',
    border: '1px solid #C2D9D3',
    borderRadius: '20px',
    padding: '3px 10px',
    fontFamily: "'Lora', serif",
  },
  rating: {
    fontSize: '0.85rem',
    color: '#C9AE7C',
  },
  buttonRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '10px',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '0.75rem',
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
    fontSize: '0.75rem',
    backgroundColor: 'transparent',
    color: '#8B775E',
    border: '1px solid #EADBCF',
    borderRadius: '50px',
    cursor: 'default',
    fontFamily: "'Lora', serif",
    width: '100%',
  },
}
