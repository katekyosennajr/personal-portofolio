const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Create MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'product_management'
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Role-based authorization middleware
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

// Initialize database and tables
const initializeDatabase = async () => {
  try {
    // Create users table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create products table
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        image VARCHAR(255),
        rating_rate FLOAT,
        rating_count INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id INT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Check if admin exists
    const [adminResults] = await db.promise().query('SELECT * FROM users WHERE role = "admin"');
    
    if (adminResults.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.promise().query(
        'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'admin@example.com', 'admin']
      );
      console.log('Default admin user created');
    }

    // Initialize products if empty
    const [productResults] = await db.promise().query('SELECT COUNT(*) as count FROM products');
    
    if (productResults[0].count === 0) {
      const response = await axios.get('https://fakestoreapi.com/products');
      const products = response.data;

      // Add sample laptop product
      const sampleLaptop = {
        title: 'Gaming Laptop',
        price: 999.99,
        description: 'High-performance gaming laptop with RTX graphics',
        category: 'laptop',
        image: 'https://via.placeholder.com/300',
        rating: { rate: 4.5, count: 50 }
      };

      // Insert products
      const allProducts = [...products, sampleLaptop];
      
      for (const product of allProducts) {
        await db.promise().query(
          'INSERT INTO products (title, price, description, category, image, rating_rate, rating_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            product.title,
            product.price,
            product.description,
            product.category,
            product.image,
            product.rating.rate,
            product.rating.count
          ]
        );
      }
      console.log('Initialized database with products');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Connect to MySQL and initialize
db.connect(async (err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
  
  // Initialize database
  await initializeDatabase();
});

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Validate input
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const [userResults] = await db.promise().query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (userResults.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await db.promise().query(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error in registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Get user
    const [users] = await db.promise().query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all products with search and sort
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const { search, sortBy, sortOrder = 'asc' } = req.query;
    
    let query = 'SELECT * FROM products';
    const params = [];
    
    if (search) {
      query += ' WHERE title LIKE ? OR description LIKE ? OR category LIKE ?';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (sortBy) {
      query += ` ORDER BY ${sortBy} ${sortOrder}`;
    }
    
    const [products] = await db.promise().query(query, params);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new product
app.post('/api/products', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { title, price, description, category, image } = req.body;
    
    const [result] = await db.promise().query(
      'INSERT INTO products (title, price, description, category, image, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title, price, description, category, image || 'https://via.placeholder.com/150', req.user.id]
    );

    res.status(201).json({
      message: 'Product added successfully',
      productId: result.insertId
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product categories
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const [results] = await db.promise().query('SELECT DISTINCT category FROM products');
    const categories = results.map(row => row.category);
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
