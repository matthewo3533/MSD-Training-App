import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import intakeRoutes from './routes/intakes';
import skillRoutes from './routes/skills';
import sessionRoutes from './routes/sessions';
import userRoutes from './routes/users';
import exportRoutes from './routes/exports';
import auditRoutes from './routes/audit';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/intakes', intakeRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/audit', auditRoutes);

// Serve static files from React app (always serve in production, also in deployment)
const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  
  // Serve React app for all non-API routes
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// Error handler (must be last)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  errorHandler(err, req, res, next);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendBuildPath)) {
    console.log(`✓ Serving frontend from: ${frontendBuildPath}`);
  } else {
    console.log(`⚠ Frontend build not found at: ${frontendBuildPath}`);
  }
  console.log(`✓ Health check available at: http://0.0.0.0:${PORT}/health`);
}).on('error', (err: NodeJS.ErrnoException) => {
  console.error('✗ Failed to start server:', err);
  process.exit(1);
});

