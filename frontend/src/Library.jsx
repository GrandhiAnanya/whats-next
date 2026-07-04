import { useState, useEffect } from 'react'
import { useIsMobile } from './useIsMobile'
import { db } from './firebase'
import {
  doc, setDoc, updateDoc, deleteDoc, getDocs, collection,
  query, where, serverTimestamp,
} from 'firebase/firestore'

// ── Star Picker ───────────────────────────────────────────────────────────────
// Renders 5 clickable stars; filled up to `value`, rest are empty.
function StarPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.1rem',
            color: star <= (value || 0) ? '#C9AE7C' : '#EADBCF',
            padding: '2px',
            lineHeight: 1,
          }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// ── Library ───────────────────────────────────────────────────────────────────
function Library({ user, onBack }) {
  const isMobile = useIsMobile()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [readBooks, setReadBooks] = useState([])
  const [wantBooks, setWantBooks] = useState([])
  // Maps a book/item ID → selected star count while the inline picker is open
  const [pendingRating, setPendingRating] = useState({})

  // ── Fetch library on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetchLibrary()
  }, [])

  async function fetchLibrary() {
    // Fetch read shelf and want-to-read shelf in parallel
    
    const snapshot = await getDocs(collection(db, 'users', user.uid, 'library'))
    const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    setReadBooks(all.filter((b) => b.status === 'read'))
    setWantBooks(all.filter((b) => b.status !== 'read'))
  
  }

  // ── Google Books search ────────────────────────────────────────────────────
  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=5&key=${import.meta.env.VITE_GOOGLE_BOOKS_API_KEY}`
      )
      const data = await res.json()
      setSearchResults(data.items || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // ── Save a Google Books result to Firestore ────────────────────────────────
  async function saveBook(item, status, rating = null) {
    const { volumeInfo } = item
    await setDoc(doc(db, 'users', user.uid, 'library', item.id), {
      title: volumeInfo.title || 'Unknown',
      authors: volumeInfo.authors?.join(', ') || 'Unknown',
      thumbnail: volumeInfo.imageLinks?.thumbnail || null,
      categories: volumeInfo.categories?.join(', ') || null,
      status,
      rating,
      addedAt: serverTimestamp(),
    })
    closePending(item.id)
    setSearchQuery('')
    setSearchResults([])
    fetchLibrary()
  }

  // ── Update rating on an existing read book ─────────────────────────────────
  async function updateRating(bookId, rating) {
    await updateDoc(doc(db, 'users', user.uid, 'library', bookId), { rating })
    // Update locally so the stars reflect the change immediately
    setReadBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, rating } : b)))
  }

  // ── Move a want-to-read book to the read shelf ─────────────────────────────
  async function markAsRead(bookId, rating) {
    await updateDoc(doc(db, 'users', user.uid, 'library', bookId), {
      status: 'read',
      rating: rating || null,
    })
    closePending(bookId)
    fetchLibrary()
  }

  // ── Remove a book from the library ────────────────────────────────────────
  async function removeBook(bookId) {
    await deleteDoc(doc(db, 'users', user.uid, 'library', bookId))
    setReadBooks((prev) => prev.filter((b) => b.id !== bookId))
    setWantBooks((prev) => prev.filter((b) => b.id !== bookId))
  }

  function openPending(id) {
    setPendingRating((prev) => ({ ...prev, [id]: 0 }))
  }
  function closePending(id) {
    setPendingRating((prev) => { const n = { ...prev }; delete n[id]; return n })
  }
  function setPending(id, stars) {
    setPendingRating((prev) => ({ ...prev, [id]: stars }))
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={{ ...styles.header, padding: isMobile ? '14px 20px' : '22px 48px' }}>
        <button style={styles.backButton} onClick={onBack}>← Back</button>
        <h1 style={styles.heading}>My Library</h1>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — Search and add books
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ ...styles.section, padding: isMobile ? '0 20px 32px' : '0 48px 52px' }}>
        <div style={styles.searchRow}>
          <input
            style={styles.input}
            type="text"
            placeholder="Search for a book to add..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button style={styles.searchButton} onClick={handleSearch}>
            Search
          </button>
          {searchResults.length > 0 && (
            <button
              style={styles.clearButton}
              onClick={() => { setSearchQuery(''); setSearchResults([]) }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {searchLoading && <p style={styles.hint}>Searching…</p>}

        {searchResults.length > 0 && (
          <div style={styles.searchResults}>
            {searchResults.map((item) => {
              const { volumeInfo } = item
              const thumb = volumeInfo.imageLinks?.thumbnail
              const starring = pendingRating[item.id]

              return (
                <div key={item.id} style={styles.searchCard}>
                  {thumb ? (
                    <img src={thumb} alt={volumeInfo.title} style={styles.searchThumb} />
                  ) : (
                    <div style={styles.searchThumbPlaceholder}>No Cover</div>
                  )}
                  <div style={styles.searchCardBody}>
                    <p style={styles.searchTitle}>{volumeInfo.title}</p>
                    <p style={styles.searchMeta}>{volumeInfo.authors?.join(', ')}</p>

                    {/* Inline star picker appears after "Mark as Read" is clicked */}
                    {starring !== undefined ? (
                      <div>
                        <p style={styles.hint}>Rate it (optional):</p>
                        <StarPicker
                          value={starring}
                          onChange={(s) => setPending(item.id, s)}
                        />
                        <div style={styles.buttonRow}>
                          <button
                            style={styles.actionButton}
                            onClick={() => saveBook(item, 'read', starring || null)}
                          >
                            Save
                          </button>
                          <button
                            style={styles.mutedButton}
                            onClick={() => closePending(item.id)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={styles.buttonRow}>
                        <button
                          style={styles.actionButton}
                          onClick={() => openPending(item.id)}
                        >
                          Mark as Read
                        </button>
                        <button
                          style={styles.mutedButton}
                          onClick={() => saveBook(item, 'want_to_read')}
                        >
                          Want to Read
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — Read shelf
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ ...styles.section, padding: isMobile ? '0 20px 32px' : '0 48px 52px' }}>
        <h2 style={styles.shelfHeading}>Books I've Read</h2>
        {readBooks.length === 0 ? (
          <p style={styles.hint}>Nothing here yet — search above to add books.</p>
        ) : (
          <div style={styles.grid}>
            {readBooks.map((book) => (
              <div key={book.id} style={{ ...styles.card, position: 'relative' }}>
                <button
                  style={styles.removeButton}
                  onClick={() => removeBook(book.id)}
                  title="Remove from library"
                >
                  ✕
                </button>
                {book.thumbnail ? (
                  <img src={book.thumbnail} alt={book.title} style={styles.thumbnail} />
                ) : (
                  <div style={styles.thumbnailPlaceholder}>No Cover</div>
                )}
                <div style={styles.cardBody}>
                  <p style={styles.cardTitle}>{book.title}</p>
                  <p style={styles.cardMeta}>{book.authors}</p>
                  <StarPicker
                    value={book.rating}
                    onChange={(rating) => updateRating(book.id, rating)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3 — Want to Read shelf
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ ...styles.section, padding: isMobile ? '0 20px 32px' : '0 48px 52px' }}>
        <h2 style={styles.shelfHeading}>Want to Read</h2>
        {wantBooks.length === 0 ? (
          <p style={styles.hint}>Nothing on your reading list yet.</p>
        ) : (
          <div style={styles.grid}>
            {wantBooks.map((book) => {
              const starring = pendingRating[book.id]
              return (
                <div key={book.id} style={{ ...styles.card, position: 'relative' }}>
                  <button
                    style={styles.removeButton}
                    onClick={() => removeBook(book.id)}
                    title="Remove from library"
                  >
                    ✕
                  </button>
                  {book.thumbnail ? (
                    <img src={book.thumbnail} alt={book.title} style={styles.thumbnail} />
                  ) : (
                    <div style={styles.thumbnailPlaceholder}>No Cover</div>
                  )}
                  <div style={styles.cardBody}>
                    <p style={styles.cardTitle}>{book.title}</p>
                    <p style={styles.cardMeta}>{book.authors}</p>

                    {starring !== undefined ? (
                      <div>
                        <p style={styles.hint}>Rate it (optional):</p>
                        <StarPicker
                          value={starring}
                          onChange={(s) => setPending(book.id, s)}
                        />
                        <div style={styles.buttonRow}>
                          <button
                            style={styles.actionButton}
                            onClick={() => markAsRead(book.id, starring)}
                          >
                            Save
                          </button>
                          <button
                            style={styles.mutedButton}
                            onClick={() => closePending(book.id)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        style={{ ...styles.actionButton, marginTop: '8px' }}
                        onClick={() => openPending(book.id)}
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
  heading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '2rem',
    fontWeight: '600',
    color: '#5F4C3B',
    margin: 0,
    textTransform: 'lowercase',
  },
  section: {
    maxWidth: '1000px',
    margin: '48px auto 0',
    padding: '0 48px 52px',
    boxSizing: 'border-box',
    textAlign: 'left',
  },
  shelfHeading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.3rem',
    fontWeight: '600',
    color: '#5F4C3B',
    marginBottom: '20px',
    borderLeft: '4px solid #C9AE7C',
    paddingLeft: '12px',
    textTransform: 'lowercase',
  },
  searchRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px',
  },
  input: {
    flex: 1,
    boxSizing: 'border-box',
    padding: '12px 20px',
    fontSize: '1rem',
    border: '1px solid #EADBCF',
    borderRadius: '50px',
    backgroundColor: '#fff',
    outline: 'none',
    fontFamily: "'Lora', serif",
    color: '#3D3A36',
  },
  searchButton: {
    padding: '10px 22px',
    fontSize: '0.9rem',
    backgroundColor: '#6F5B47',
    color: '#fff',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontFamily: "'Lora', serif",
    whiteSpace: 'nowrap',
  },
  clearButton: {
    padding: '10px 18px',
    fontSize: '0.9rem',
    backgroundColor: 'transparent',
    color: '#8B775E',
    border: '1px solid #EADBCF',
    borderRadius: '50px',
    cursor: 'pointer',
    fontFamily: "'Lora', serif",
    whiteSpace: 'nowrap',
  },
  hint: {
    color: '#8B775E',
    fontSize: '0.85rem',
    margin: '0 0 6px',
    fontStyle: 'italic',
  },
  searchResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  searchCard: {
    display: 'flex',
    gap: '16px',
    background: '#FFFDF9',
    border: '1px solid #EADBCF',
    borderRadius: '12px',
    padding: '12px',
    alignItems: 'flex-start',
  },
  searchThumb: {
    width: '56px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '6px',
    flexShrink: 0,
  },
  searchThumbPlaceholder: {
    width: '56px',
    height: '80px',
    backgroundColor: '#F5EBD9',
    borderRadius: '6px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: '0.7rem',
    textAlign: 'center',
  },
  searchCardBody: {
    flex: 1,
  },
  searchTitle: {
    fontWeight: '500',
    fontSize: '0.95rem',
    margin: '0 0 2px',
    color: '#3D3A36',
  },
  searchMeta: {
    fontSize: '0.8rem',
    color: '#8B775E',
    margin: '0 0 10px',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '6px 14px',
    fontSize: '0.78rem',
    backgroundColor: '#6F5B47',
    color: '#fff',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontFamily: "'Lora', serif",
  },
  mutedButton: {
    padding: '6px 14px',
    fontSize: '0.78rem',
    backgroundColor: 'transparent',
    color: '#6F5B47',
    border: '1px solid #EADBCF',
    borderRadius: '50px',
    cursor: 'pointer',
    fontFamily: "'Lora', serif",
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#FFFDF9',
    border: '1px solid #EADBCF',
    borderRadius: '16px',
    overflow: 'hidden',
    textAlign: 'left',
  },
  removeButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#8B775E',
    fontSize: '0.75rem',
    lineHeight: 1,
    padding: '2px 4px',
    zIndex: 1,
  },
  thumbnail: {
    width: '100%',
    height: '180px',
    objectFit: 'cover',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '180px',
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
    fontSize: '0.9rem',
    marginBottom: '4px',
    color: '#3D3A36',
  },
  cardMeta: {
    fontSize: '0.78rem',
    color: '#8B775E',
    margin: '0 0 8px',
  },
}

export default Library
