import { useState, useEffect, useRef } from 'react'
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
  // Each entry: { readBook, results, loading }
  const [sections, setSections] = useState([])
  const [library, setLibrary] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [hasReadBooks, setHasReadBooks] = useState(true)
  const carouselRefs = useRef([])

  useEffect(() => {
    async function load() {
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'library'))
      const allBooks = snapshot.docs.map((d) => d.data())
      setLibrary(allBooks)

      const readBooks = allBooks.filter((b) => b.status === 'read')

      if (readBooks.length === 0) {
        setHasReadBooks(false)
        setInitialLoading(false)
        return
      }

      // Set up a loading placeholder for each section immediately
      setSections(readBooks.map((b) => ({ readBook: b, results: [], loading: true })))
      setInitialLoading(false)

      const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

      // Fetch all sections in parallel
      await Promise.all(
        readBooks.map(async (book, index) => {
          try {
            const [tfidfRes, googleRes] = await Promise.all([
              fetch(`${import.meta.env.VITE_API_URL}/recommendations?title=${encodeURIComponent(book.title)}&n=4`),
              fetch(`https://www.googleapis.com/books/v1/volumes?q=subject:"${encodeURIComponent(book.categories || book.title)}"&maxResults=4&key=${API_KEY}`),
            ])

            const tfidfData = await tfidfRes.json()
            const googleData = await googleRes.json()

            const tfidfResults = (tfidfData[0]?.error ? [] : tfidfData).map((item) => ({
              title: item.title,
              authors: item.authors,
              categories: item.categories || null,
              thumbnail: item.thumbnail || null,
            }))

            const googleResults = (googleData.items || []).map((item) => ({
              title: item.volumeInfo?.title || 'Unknown',
              authors: item.volumeInfo?.authors?.join(', ') || '',
              categories: item.volumeInfo?.categories?.join(', ') || null,
              thumbnail: item.volumeInfo?.imageLinks?.thumbnail || null,
            }))

            // Remove Google results whose title already appears in TF-IDF results
            const tfidfTitles = new Set(tfidfResults.map((b) => b.title.toLowerCase()))
            const uniqueGoogle = googleResults.filter(
              (b) => !tfidfTitles.has(b.title.toLowerCase())
            )

            const combined = [...tfidfResults, ...uniqueGoogle]

            setSections((prev) =>
              prev.map((s, i) => (i === index ? { ...s, results: combined, loading: false } : s))
            )
          } catch {
            setSections((prev) =>
              prev.map((s, i) => (i === index ? { ...s, results: [], loading: false } : s))
            )
          }
        })
      )
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

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>← Back</button>
        <h1 style={styles.heading}>What's Next?</h1>
      </div>

      <main style={styles.main}>
        {initialLoading && (
          <p style={styles.feedback}>Loading your reading history...</p>
        )}

        {!initialLoading && !hasReadBooks && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              Add some books to your Read shelf in My Library first!
            </p>
            <button style={styles.primaryButton} onClick={onBack}>← Go back</button>
          </div>
        )}

        {sections.map((section, i) => (
          <div key={i} style={styles.section}>
            <h2 style={styles.resultsHeading}>
              because you read {section.readBook.title}
            </h2>
            {section.loading ? (
              <p style={styles.feedback}>Finding recommendations...</p>
            ) : section.results.length === 0 ? (
              <p style={styles.feedback}>No recommendations found for this title.</p>
            ) : (
              <div style={styles.carouselWrapper}>
                {section.results.length > 4 && (
                  <button
                    style={styles.arrowButton}
                    onClick={() => carouselRefs.current[i]?.scrollBy({ left: -220, behavior: 'smooth' })}
                  >←</button>
                )}
                <div
                  style={styles.carousel}
                  ref={(el) => (carouselRefs.current[i] = el)}
                >
                  {section.results.map((book, j) => (
                    <BookCard
                      key={j}
                      book={book}
                      isSaved={library.some((b) => b.title === book.title)}
                      onSave={() => saveBook(book)}
                    />
                  ))}
                </div>
                {section.results.length > 4 && (
                  <button
                    style={styles.arrowButton}
                    onClick={() => carouselRefs.current[i]?.scrollBy({ left: 220, behavior: 'smooth' })}
                  >→</button>
                )}
              </div>
            )}
          </div>
        ))}
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
  section: {
    marginBottom: '56px',
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
  carouselWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  carousel: {
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    gap: '20px',
    flex: 1,
  },
  arrowButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#FFFDF9',
    border: '1px solid #EADBCF',
    color: '#6F5B47',
    cursor: 'pointer',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontFamily: "'Lora', serif",
  },
  card: {
    backgroundColor: '#FFFDF9',
    border: '1px solid #EADBCF',
    borderRadius: '16px',
    overflow: 'hidden',
    textAlign: 'left',
    width: '140px',
    flexShrink: 0,
  },
  thumbnail: {
    width: '100%',
    height: '180px',
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
    padding: '8px',
  },
  cardTitle: {
    fontWeight: '500',
    fontSize: '0.78rem',
    marginBottom: '4px',
    color: '#3D3A36',
  },
  cardMeta: {
    fontSize: '0.72rem',
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
