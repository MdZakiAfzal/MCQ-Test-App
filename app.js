const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const hpp = require('hpp');
const compression = require('compression');

const AppError = require('./utils/appErrors');
const globalErrorHandler = require('./Controllers/error_controller');

// Routers
const testRouter = require('./Routes/test_router');
const attemptRouter = require('./Routes/attempt_router');
const authRouter = require('./Routes/auth_router');

const app = express();

// 1) GLOBAL MIDDLEWARES
// Security HTTP headers
app.use(helmet());

// CORS 
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // TODO: replace * with your React domain in production
  credentials: true
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined')); // production logs
}

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Compression
app.use(compression());

// Rate limiting (100 requests per 15 min per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// 2) ROUTES
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/tests', testRouter);
app.use('/api/v1/attempts', attemptRouter);

// 3) UNHANDLED ROUTES
app.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 4) GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

module.exports = app;
