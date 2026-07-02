import { useState, useEffect, useRef } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, setDoc, getDocs, doc } from 'firebase/firestore'
import Auth from './Auth'
import Profile from './Profile'
import Library from './Library'
import WhatsNext from './WhatsNext'
import Popular from './Popular'

// Genre mood pills the user can click to quickly fill in the search box
const GENRES = ['Fiction', 'Mystery', 'Biography', 'Sci-Fi', 'Romance']

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ user, onSignOut, onProfile, onLibrary, onWhatsNext, onPopular }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const avatarRef = useRef(null)

  // Close the dropdown when the user clicks anywhere outside the avatar area
  useEffect(() => {
    function handleOutsideClick(e) {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('click', handleOutsideClick)
    }
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [dropdownOpen])

  const initial =
    user?.displayName?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    '?'

  return (
    <nav style={styles.navbar}>
      {/* ── Avatar button + dropdown (left side) ── */}
      <div ref={avatarRef} style={{ position: 'relative' }}>
        <button
          style={styles.avatarButton}
          onClick={() => setDropdownOpen((prev) => !prev)}
        >
          {initial}
        </button>
        {dropdownOpen && (
          <div style={styles.dropdown}>
            <button
              style={styles.dropdownItem}
              onClick={() => { onProfile(); setDropdownOpen(false) }}
            >
              Profile
            </button>
            <button
              style={styles.dropdownItem}
              onClick={() => { onSignOut(); setDropdownOpen(false) }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* ── Nav links (right side) ── */}
      <div style={styles.navLinks}>
        <span style={{ ...styles.navLink, cursor: 'pointer' }} onClick={onLibrary}> My Library </span>
        <span style={{ ...styles.navLink, cursor: 'pointer' }} onClick={onWhatsNext}>What's Next</span>
        <span style={{ ...styles.navLink, cursor: 'pointer' }} onClick={onPopular}>Popular</span>
      </div>
    </nav>
  )
}

// ── Book Card ─────────────────────────────────────────────────────────────────
// Displays a single recommendation result
function BookCard({ book, onSave, isSaved }) {
  return (
    <div style={styles.card}>
      {/* Show the cover image if available, otherwise a placeholder */}
      {book.thumbnail ? (
        <img src={book.thumbnail} alt={book.title} style={styles.thumbnail} />
      ) : (
        <div style={styles.thumbnailPlaceholder}>No Cover</div>
      )}
      <div style={styles.cardBody}>
        <p style={styles.cardTitle}>{book.title}</p>
        <p style={styles.cardMeta}>{book.authors}</p>
        <p style={styles.cardMeta}>{book.categories}</p>
        {book.average_rating && (
          <p style={styles.cardRating}>★ {book.average_rating}</p>
        )}
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

// ── App (main component) ──────────────────────────────────────────────────────
function App() {
  // State: what the user typed in the input
  const [title, setTitle] = useState('')
  // State: the list of book objects returned from the API
  const [recommendations, setRecommendations] = useState([])
  // State: true while waiting for the API to respond
  const [loading, setLoading] = useState(false)
  // State: an error message to show if something goes wrong
  const [error, setError] = useState('')
  // State: the currently signed-in Firebase user (null means not logged in)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  // State: books the user has saved to their library
  const [library, setLibrary] = useState([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [showWhatsNext, setShowWhatsNext] = useState(false)
  const [showPopular, setShowPopular] = useState(false)
  const [authorBooks, setAuthorBooks] = useState([])
  const [similarBooks, setSimilarBooks] = useState([])
  const [resultCount, setResultCount] = useState(5)
  const [authorCount, setAuthorCount] = useState(5)
  const [similarCount, setSimilarCount] = useState(5)
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [googleSuggestions, setGoogleSuggestions] = useState([])
  const [selectedAuthor, setSelectedAuthor] = useState('')
  const [displayValue, setDisplayValue] = useState('')
  const [isFetchingGoogle, setIsFetchingGoogle] = useState(false)
  const [justSelected, setJustSelected] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  // ── Auth listener ─────────────────────────────────────────────────────────
  // onAuthStateChanged fires whenever the user signs in or out — keeps `user` in sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
    })
    return () => unsubscribe()  // stop listening when the component unmounts
  }, [])

  // Show the Auth screen until Firebase confirms a signed-in user


  // ── Floating petals ──────────────────────────────────────────────────────────
  // useEffect runs once after the component mounts (the empty [] means "run once")
  // setInterval creates a new petal every 2200ms; each petal floats down and is
  // removed after 20s to avoid the DOM filling up with invisible elements
  useEffect(() => {
    const container = document.getElementById('petal-container')
    if (!container) return
    const interval = setInterval(() => {
      const petal = document.createElement('div')
      const size = 6 + Math.random() * 12          // random size 6–18px
      const left = Math.random() * 100              // random horizontal position
      const duration = 10 + Math.random() * 12         // fall speed 10–22s
      const delay = Math.random() * 15              // stagger start 0–15s
      const opacity = (0.2 + Math.random() * 0.4).toFixed(2)  // 0.2–0.6

      petal.className = 'petal'
      petal.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${left}%;
        top: -20px;
        background: rgba(201,174,124,${opacity});
        border-radius: 80% 0 80% 0;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
      `
      container.appendChild(petal)
      setTimeout(() => petal.remove(), 20000)
    }, 2200)

    // Cleanup: stop creating petals if the component ever unmounts
    return () => clearInterval(interval)
  }, [])

  // Debounced autocomplete: fires 300ms after the user stops typing, only if >= 3 chars
  useEffect(() => {
    if (justSelected) {
      setJustSelected(false)
      return
    }
    if (title.length < 3) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:8000/search?q=${encodeURIComponent(title)}`)
        const data = await res.json()
        setSuggestions(data)
        setShowDropdown(true)
      } catch {
        setSuggestions([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [title])

  useEffect(() => {
    if (!user?.uid) return
    async function fetchLibrary() {
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'library'))
      setLibrary(snapshot.docs.map((d) => d.data()))
    }
    fetchLibrary()
  }, [user?.uid])

  if (authLoading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Lora', serif",
      color: '#8B775E',
      fontSize: '1rem',
      fontStyle: 'italic',
      background: 'transparent'
    }}>
      Opening your library...
    </div>
  )
  if (!user) return <Auth />

  // ── Library fetch ──────────────────────────────────────────────────────────
  // Runs once after sign-in; reads all saved books from Firestore into state.
  // user.uid is the unique Firebase ID for the signed-in user.
  // eslint-disable-next-line react-hooks/rules-of-hooks


  // Saves a book to Firestore and updates local state immediately so the button
  // switches to "Saved ✓" without waiting for a re-fetch.
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

  if (showProfile) {
    return <Profile user={user} onBack={() => setShowProfile(false)} />
  }

  if (showLibrary) {
    return <Library user={user} onBack={() => setShowLibrary(false)} />
  }

  if (showWhatsNext) {
    return <WhatsNext user={user} onBack={() => setShowWhatsNext(false)} />
  }

  if (showPopular) {
    return <Popular user={user} onBack={() => setShowPopular(false)} />
  }

  // Fetches "more by this author" and "more like this genre" from Google Books
  // in parallel, then stores results in state to display below the main results
  async function fetchExtras(firstBook, authorN = 5, similarN = 5) {

    const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
    const authorQuery = selectedAuthor || firstBook.authors
    const mapToGenre = (category) => {
      if (!category) return 'contemporary fiction'
      const cat = category.toLowerCase()
      if (cat.includes('romance') || cat.includes('man-woman') || cat.includes('love')) return 'romance novels'
      if (cat.includes('thriller') || cat.includes('mystery') || cat.includes('crime')) return 'thriller mystery'
      if (cat.includes('fantasy') || cat.includes('magic')) return 'fantasy fiction'
      if (cat.includes('science fiction') || cat.includes('sci-fi')) return 'science fiction'
      if (cat.includes('biography') || cat.includes('autobiography')) return 'biography'
      if (cat.includes('self-help') || cat.includes('personal development')) return 'self help'
      if (cat.includes('history')) return 'history books'
      if (cat.includes('young adult')) return 'young adult fiction'
      return category
    }
    const rawCategory = selectedCategory || firstBook.categories || ''
    const mappedGenre = mapToGenre(rawCategory)
    const similarQuery = `subject:"${mappedGenre}"`
    const [authorRes, subjectRes] = await Promise.all([
      fetch(`https://www.googleapis.com/books/v1/volumes?q=inauthor:"${encodeURIComponent(authorQuery)}"&maxResults=${authorN}&orderBy=newest&key=${API_KEY}`),
      fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(similarQuery)}&maxResults=${similarN}&orderBy=relevance&printType=books&key=${API_KEY}`),
    ])
    const [authorData, subjectData] = await Promise.all([authorRes.json(), subjectRes.json()])

    const searchedTitle = title.toLowerCase().trim()

    const authorMapped = (authorData.items || [])
      .map(item => ({
        title: item.volumeInfo?.title || '',
        authors: item.volumeInfo?.authors?.join(', ') || '',
        categories: item.volumeInfo?.categories?.join(', ') || '',
        thumbnail: item.volumeInfo?.imageLinks?.thumbnail || null,
      }))
      .filter(book => book.title.toLowerCase().trim() !== searchedTitle)

    const similarMapped = (subjectData.items || [])
      .map(item => ({
        title: item.volumeInfo?.title || '',
        authors: item.volumeInfo?.authors?.join(', ') || '',
        categories: item.volumeInfo?.categories?.join(', ') || '',
        thumbnail: item.volumeInfo?.imageLinks?.thumbnail || null,
      }))
      .filter(book => book.title.toLowerCase().trim() !== searchedTitle)
      

    setAuthorBooks(authorMapped)
    setSimilarBooks(similarMapped)
  }

  // Called when the user clicks "Get Recommendations" or "Show More"
  // async/await lets us write async code that reads like normal sequential code
  async function fetchRecommendations(count = 5) {
    if (!title.trim()) return
    setLoading(true)
    setError('')
    setRecommendations([])
    setResultCount(count)
    if (count === 5) {
      setAuthorBooks([])
      setSimilarBooks([])
      setAuthorCount(5)
      setSimilarCount(5)
    }

    try {
      const response = await fetch(
        `http://localhost:8000/recommendations?title=${encodeURIComponent(title)}&n=${count}`
      )
      const data = await response.json()

      // The API returns [{error: "..."}] if the title wasn't found
      if (data[0]?.error) {
        setError(`Couldn't find "${title}" in our library. Try another title.`)
      } else {
        setRecommendations(data)
        if (count === 5 && data.length > 0) fetchExtras(data[0])
      }
    } catch {
      // This runs if the network request itself fails (e.g. backend isn't running)
      setError('Could not reach the server. Make sure the backend is running.')
    } finally {
      // finally always runs — use it to reset loading state whether it succeeded or failed
      setLoading(false)
    }
  }

  // When a genre pill is clicked, put that genre name in the search box
  function handleGenrePill(genre) {
    setTitle(genre)
  }

  return (
    <div style={styles.page}>
      <Navbar
        user={user}
        onSignOut={() => signOut(auth)}
        onProfile={() => setShowProfile(true)}
        onLibrary={() => setShowLibrary(true)}
        onWhatsNext={() => setShowWhatsNext(true)}
        onPopular={() => setShowPopular(true)}
      />

      <main style={styles.main}>
        {/* ── Page heading ── */}
        <h1 style={styles.heading}>What's Next?</h1>
        <br></br>
        <p style={styles.subheading}>
          Enter a book you've enjoyed and we'll find your next read.
        </p>

        {/* ── Search bar ── */}
        <div style={styles.searchRow}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
              type="text"
              placeholder="e.g. Gilead, The Alchemist..."
              value={displayValue}
              onChange={(e) => { setTitle(e.target.value); setDisplayValue(e.target.value); setSelectedAuthor(''); setSelectedCategory('') }}
              onKeyDown={(e) => e.key === 'Enter' && fetchRecommendations(5)}
              onFocus={() => title.length >= 3 && setShowDropdown(true)}
              onBlur={() => {
                if (isFetchingGoogle) return
                setTimeout(() => setShowDropdown(false), 200)
              }}
            />
            {showDropdown && (
              <div style={styles.suggestionsDropdown}>
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    style={styles.suggestionItem}
                    onMouseDown={() => {
                      setTitle(s.title)
                      setJustSelected(true)
                      setSelectedAuthor(s.authors)
                      setSelectedCategory(s.categories || '')
                      setDisplayValue(`${s.title} by ${s.authors}`)
                      setShowDropdown(false)
                    }}
                  >
                    <span>{s.title}</span>
                    <span style={{ color: '#8B775E', fontSize: '0.8rem' }}>{s.authors}</span>
                  </div>
                ))}
                <div
                  style={styles.suggestionFallback}
                  onMouseDown={async () => {
                    const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
                    setIsFetchingGoogle(true)
                    try {
                      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=5&key=${API_KEY}`)
                      const data = await res.json()
                      const mapped = (data.items || []).map((item) => ({
                        title: item.volumeInfo?.title || 'Unknown',
                        authors: item.volumeInfo?.authors?.join(', ') || '',
                        categories: item.volumeInfo?.categories?.join(', ') || '',
                      }))
                      setGoogleSuggestions(mapped)
                    } catch {
                      setGoogleSuggestions([])
                    } finally {
                      setIsFetchingGoogle(false)
                    }
                  }}
                >
                  Can't find it? Search Google Books →
                </div>
                {isFetchingGoogle && (
                  <div style={{ padding: '10px 16px', color: '#8B775E', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Searching Google Books...
                  </div>
                )}
                {googleSuggestions.map((s, i) => (
                  <div
                    key={`g-${i}`}
                    style={styles.suggestionItem}
                    onMouseDown={() => {
                      setTitle(s.title)
                      setJustSelected(true)
                      setSelectedAuthor(s.authors)
                      setSelectedCategory(s.categories || '')
                      setDisplayValue(`${s.title} by ${s.authors}`)
                      setShowDropdown(false)
                      setGoogleSuggestions([])
                      if (!s.categories) {
                        fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:"${encodeURIComponent(s.title)}"+inauthor:"${encodeURIComponent(s.authors)}"&maxResults=1&key=${import.meta.env.VITE_GOOGLE_BOOKS_API_KEY}`)
                          .then(r => r.json())
                          .then(data => {
                            const cat = data.items?.[0]?.volumeInfo?.categories?.join(', ') || ''
                            if (cat) setSelectedCategory(cat)
                          })
                          .catch(() => {})
                      }
                    }}
                  >
                    <span>{s.title}</span>
                    <span style={{ color: '#8B775E', fontSize: '0.8rem' }}>{s.authors}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button style={styles.button} onClick={() => fetchRecommendations(5)}>
            Get Recommendations
          </button>
        </div>

        {/* ── Genre mood pills ── */}
        <div style={styles.pillRow}>
          {GENRES.map((genre) => (
            <button
              key={genre}
              style={styles.pill}
              onClick={() => handleGenrePill(genre)}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* ── Feedback: loading / error / results ── */}
        {loading && <p style={styles.feedback}>Finding your next read...</p>}
        {error && <p style={{ ...styles.feedback, color: '#b0413e' }}>{error}</p>}

        {/* ── Results grid ── */}
        {recommendations.length > 0 && (
          <div>
            <h2 style={styles.resultsHeading}>Your Next Reads</h2>
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
            {recommendations.length >= resultCount && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                  style={styles.showMoreButton}
                  onClick={() => fetchRecommendations(resultCount + 5)}
                >
                  Show More
                </button>
              </div>
            )}
          </div>
        )}

        {authorBooks.length > 0 && (
          <div>
            <h2 style={styles.resultsHeading}>More from {selectedAuthor || recommendations[0]?.authors}</h2>
            <div style={styles.grid}>
              {authorBooks.map((book, i) => (
                <BookCard
                  key={i}
                  book={book}
                  isSaved={library.some((b) => b.title === book.title)}
                  onSave={() => saveBook(book)}
                />
              ))}
            </div>
            {authorBooks.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                  style={styles.showMoreButton}
                  onClick={() => {
                    const next = authorCount + 5
                    setAuthorCount(next)
                    fetchExtras({ authors: selectedAuthor || recommendations[0]?.authors, categories: recommendations[0]?.categories }, next, similarCount)
                  }}
                >
                  Show More
                </button>
              </div>
            )}
          </div>
        )}

        {similarBooks.length > 0 && (
          <div>
            <h2 style={styles.resultsHeading}>More like this</h2>
            <div style={styles.grid}>
              {similarBooks.map((book, i) => (
                <BookCard
                  key={i}
                  book={book}
                  isSaved={library.some((b) => b.title === book.title)}
                  onSave={() => saveBook(book)}
                />
              ))}
            </div>
            {similarBooks.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                  style={styles.showMoreButton}
                  onClick={() => {
                    const next = similarCount + 5
                    setSimilarCount(next)
                    fetchExtras(recommendations[0], authorCount, next)
                  }}
                >
                  Show More
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  avatarButton: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: '#C9AE7C',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'Lora', serif",
    fontSize: '1rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '48px',
    left: '0',
    background: '#FFFDF9',
    border: '1px solid #EADBCF',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    zIndex: 100,
    minWidth: '140px',
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '11px 16px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: "'Lora', serif",
    fontSize: '0.9rem',
    color: '#6F5B47',
  },

  page: {
    minHeight: '100vh',
    background: 'transparent',
    fontFamily: "'Lora', serif",
    color: '#3D3A36',
    position: 'relative',
    zIndex: 10,
  },
  navbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '22px 48px',
    borderBottom: '1px solid #EADBCF',
    backgroundColor: 'transparent',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
  },
  navLinks: {
    display: 'flex',
    gap: '28px',
  },
  navLink: {
    textDecoration: 'none',
    color: '#6F5B47',
    fontSize: '0.95rem',
  },
  main: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '60px 80px',
    textAlign: 'center',
  },
  heading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '3.8rem',
    fontWeight: '600',
    color: '#5F4C3B',
    marginBottom: '16px',
    textTransform: 'lowercase',
  },
  subheading: {
    fontStyle: 'italic',
    color: '#8B775E',
    marginBottom: '40px',
    fontSize: '1.2rem',
    marginTop: '16px',
  },
  searchRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    maxWidth: '720px',
    margin: '0 auto 16px',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '1rem',
    border: '1px solid #EADBCF',
    borderRadius: '50px',
    backgroundColor: '#fff',
    outline: 'none',
    fontFamily: "'Lora', serif",
    color: '#3D3A36',
  },
  button: {
    padding: '8px 14px',
    fontSize: '0.78rem',
    backgroundColor: '#6F5B47',
    color: '#fff',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: "'Lora', serif",
  },
  pillRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '36px',
    justifyContent: 'center',
  },
  pill: {
    padding: '7px 16px',
    fontSize: '0.85rem',
    backgroundColor: '#F5EBD9',
    border: '1px solid #EADBCF',
    borderRadius: '20px',
    cursor: 'pointer',
    color: '#6F5B47',
    fontFamily: "'Lora', serif",
  },
  feedback: {
    textAlign: 'center',
    color: '#777',
    margin: '24px 0',
  },
  resultsHeading: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#5F4C3B',
    textAlign: 'left',
    borderLeft: '4px solid #C9AE7C',
    paddingLeft: '12px',
    textTransform: 'lowercase',
    marginTop: '56px',
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
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  cardRating: {
    fontSize: '0.85rem',
    color: '#C9AE7C',
    marginTop: '6px',
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
  showMoreButton: {
    padding: '10px 28px',
    fontSize: '0.9rem',
    backgroundColor: 'transparent',
    color: '#6F5B47',
    border: '1px solid #C9AE7C',
    borderRadius: '50px',
    cursor: 'pointer',
    fontFamily: "'Lora', serif",
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    backgroundColor: '#FFFDF9',
    border: '1px solid #EADBCF',
    borderRadius: '16px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    zIndex: 100,
    overflow: 'hidden',
  },
  suggestionItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #F5EBD9',
    fontFamily: "'Lora', serif",
    fontSize: '0.9rem',
    color: '#3D3A36',
  },
  suggestionFallback: {
    padding: '10px 16px',
    cursor: 'pointer',
    color: '#C9AE7C',
    fontSize: '0.85rem',
    fontFamily: "'Lora', serif",
    fontStyle: 'italic',
  },
}

export default App
