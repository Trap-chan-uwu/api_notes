const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const noteRoutes = require('./routes/noteRoutes');
const authRoutes = require('./routes/authRoutes');
const mediaRoutes = require('./routes/mediaRoutes'); // Add this line
const db = require('./config/database');


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Use the routes
app.use('/api/notes', noteRoutes);
app.use('/auth', authRoutes);
app.use('/media', mediaRoutes);



const httpPort = process.env.PORT || 3000;
const httpsPort = process.env.HTTPS_PORT || 443;

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '../ssl/ca-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../ssl/ca-cert.pem'))
};

// Test database connection
db.query('SELECT 1')
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((err) => {
    console.error('Database connection failed', err);
    process.exit(1);
  });

http.createServer((req, res) => {
  res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
  res.end();
}).listen(httpPort, () => {
  console.log(`HTTP server redirecting to HTTPS on port ${httpPort}`);
});

https.createServer(httpsOptions, app).listen(httpsPort, () => {
  console.log(`HTTPS server running on port ${httpsPort}`);
});