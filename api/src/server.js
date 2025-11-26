require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const expensesRoutes = require('./routes/expensesRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const imagesRoutes = require('./routes/imagesRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/images', imagesRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    console.log('Starting API server...');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
========================================
  API Server Running
========================================
  Port: ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  URL: http://localhost:${PORT}
  Health: http://localhost:${PORT}/health
========================================
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});

startServer();

module.exports = app;
