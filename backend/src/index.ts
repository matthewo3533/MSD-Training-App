import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/intakes', intakeRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/audit', auditRoutes);

// Error handler (must be last)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  errorHandler(err, req, res, next);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

