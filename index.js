const express = require('express');
const pool = require('./db')
const app = express();

app.use(express.json());

function authenticateJWT(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(403).json({ error: 'Token missing' });
  
    jwt.verify(token, 'your_jwt_secret', (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid token' });
      req.user = user;
      next();
    });
  }  

// Routes
app.get('/books', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM books');
      res.status(200).json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/books/isbn/:isbn', (req, res) => {
    const isbn = req.params.isbn;
    pool.query('SELECT * FROM books WHERE isbn = $1', [isbn])
      .then(result => res.status(200).json(result.rows))
      .catch(err => res.status(500).json({ error: err.message }));
  });

  app.get('/books/author/:author', async (req, res) => {
    try {
      const author = req.params.author;
      const result = await pool.query('SELECT * FROM books WHERE author ILIKE $1', [`%${author}%`]);
      res.status(200).json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/books/title/:title', async (req, res) => {
    try {
      const title = req.params.title;
      const result = await pool.query('SELECT * FROM books WHERE title ILIKE $1', [`%${title}%`]);
      res.status(200).json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/books/:bookId/reviews', async (req, res) => {
    try {
      const { bookId } = req.params;
      const result = await pool.query('SELECT * FROM reviews WHERE book_id = $1', [bookId]);
      res.status(200).json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const bcrypt = require('bcrypt');
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const jwt = require('jsonwebtoken');
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, 'your_jwt_secret');
  res.status(200).json({ token });
});

app.post('/books/:bookId/reviews', authenticateJWT, async (req, res) => {
    const { bookId } = req.params;
    const { reviewText, rating } = req.body;
    const userId = req.user.userId;
  
    const result = await pool.query(
      `INSERT INTO reviews (user_id, book_id, review_text, rating) 
       VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, book_id) 
       DO UPDATE SET review_text = $3, rating = $4 
       RETURNING *`,
      [userId, bookId, reviewText, rating]
    );
    res.status(201).json(result.rows[0]);
  });

  app.delete('/books/:bookId/reviews', authenticateJWT, async (req, res) => {
    const { bookId } = req.params;
    const userId = req.user.userId;
  
    await pool.query('DELETE FROM reviews WHERE user_id = $1 AND book_id = $2', [userId, bookId]);
    res.status(204).send();
  });

  app.get('/books', (req, res) => {
    pool.query('SELECT * FROM books', (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json(result.rows);
    });
  });
  
  app.get('/books/isbn/:isbn', (req, res) => {
    const { isbn } = req.params;
  
    pool.query('SELECT * FROM books WHERE isbn = $1', [isbn])
      .then(result => {
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Book not found' });
        }
        res.status(200).json(result.rows[0]);
      })
      .catch(err => res.status(500).json({ error: err.message }));
  });

  app.get('/books/author/:author', async (req, res) => {
    try {
      const { author } = req.params;
      const result = await pool.query('SELECT * FROM books WHERE author ILIKE $1', [`%${author}%`]);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No books found for the given author' });
      }
      
      res.status(200).json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/books/title/:title', async (req, res) => {
    try {
      const { title } = req.params;
      const result = await pool.query('SELECT * FROM books WHERE title ILIKE $1', [`%${title}%`]);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No books found with the given title' });
      }
  
      res.status(200).json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/books/title/:title', async (req, res) => {
    try {
      const { title } = req.params;
      const result = await pool.query('SELECT * FROM books WHERE title ILIKE $1', [`%${title}%`]);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No books found with the given title' });
      }
  
      res.status(200).json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  })    
  

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
