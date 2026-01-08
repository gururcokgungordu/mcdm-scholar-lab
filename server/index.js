import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import analyzeRoutes from './routes/analyze.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import { initDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize database
initDatabase();

// Routes
app.use('/api', analyzeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 MCDM Backend running on http://localhost:${PORT}`);
});

export default app;
