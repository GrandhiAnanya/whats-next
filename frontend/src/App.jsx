import { useState } from 'react'

// Genre mood pills the user can click to quickly fill in the search box
const GENRES = ['Fiction', 'Mystery', 'Biography', 'Sci-Fi', 'Romance']

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav style={styles.navbar}>
      <span style={styles.navBrand}>What's Next?</span>
      <div style={styles.navLinks}>
        <a href="#" style={styles.navLink}>My Library</a>
        <a href="#" style={styles.navLink}>What's Next</a>
        <a href="#" style={styles.navLink}>Popular</a>
      </div>
    </nav>
  )
}

// ── Book Card ─────────────────────────────────────────────────────────────────
// Displays a single recommendation result
function BookCard({ book }) {
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

  // Called when the user clicks "Get Recommendations"
  // async/await lets us write async code that reads like normal sequential code
  async function fetchRecommendations() {
    if (!title.trim()) return
    setLoading(true)
    setError('')
    setRecommendations([])

    try {
      const response = await fetch(
        `http://localhost:8000/recommendations?title=${encodeURIComponent(title)}`
      )
      const data = await response.json()

      // The API returns [{error: "..."}] if the title wasn't found
      if (data[0]?.error) {
        setError(`Couldn't find "${title}" in our library. Try another title.`)
      } else {
        setRecommendations(data)
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
      <Navbar />

      <main style={styles.main}>
        {/* ── Page heading ── */}
        <h1 style={styles.heading}>What's Next?</h1>
        <p style={styles.subheading}>
          Enter a book you've enjoyed and we'll find your next read.
        </p>

        {/* ── Search bar ── */}
        <div style={styles.searchRow}>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Gilead, The Alchemist..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            // Allow submitting with the Enter key, not just the button
            onKeyDown={(e) => e.key === 'Enter' && fetchRecommendations()}
          />
          <button style={styles.button} onClick={fetchRecommendations}>
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
                <BookCard key={i} book={book} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
// Inline style objects — keeps everything in one file while we're prototyping
const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#FAF8F5',
    fontFamily: "'Georgia', serif",
    color: '#2c2c2c',
  },
  navbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 40px',
    borderBottom: '1px solid #e8e3db',
    backgroundColor: '#FAF8F5',
  },
  navBrand: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  navLinks: {
    display: 'flex',
    gap: '28px',
  },
  navLink: {
    textDecoration: 'none',
    color: '#555',
    fontSize: '0.95rem',
  },
  main: {
    maxWidth: '760px',
    margin: '0 auto',
    padding: '60px 24px',
  },
  heading: {
    fontSize: '2.2rem',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  subheading: {
    color: '#666',
    marginBottom: '32px',
    fontSize: '1rem',
  },
  searchRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '1rem',
    border: '1px solid #d8d2c8',
    borderRadius: '8px',
    backgroundColor: '#fff',
    outline: 'none',
  },
  button: {
    padding: '12px 22px',
    fontSize: '0.95rem',
    backgroundColor: '#3d3530',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  pillRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '36px',
  },
  pill: {
    padding: '7px 16px',
    fontSize: '0.85rem',
    backgroundColor: '#ede8e0',
    border: '1px solid #d8d2c8',
    borderRadius: '20px',
    cursor: 'pointer',
    color: '#3d3530',
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
    color: '#3d3530',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e8e3db',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '200px',
    backgroundColor: '#ede8e0',
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
    fontWeight: 'bold',
    fontSize: '0.95rem',
    marginBottom: '4px',
  },
  cardMeta: {
    fontSize: '0.8rem',
    color: '#777',
    margin: '2px 0',
  },
  cardRating: {
    fontSize: '0.85rem',
    color: '#b07d3a',
    marginTop: '6px',
  },
}

export default App
