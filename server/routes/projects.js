import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/projects - List all projects (optionally filtered by userId)
router.get('/', (req, res) => {
    try {
        const { userId } = req.query;

        let projects;
        if (userId) {
            projects = db.getProjectsByUserId(userId);
        } else {
            projects = db.getAllProjects();
        }

        res.json(projects);
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: error.message || 'Failed to get projects' });
    }
});

// POST /api/projects - Create new project
router.post('/', (req, res) => {
    try {
        const { name, paperName, userId, analysis } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        const project = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            paperName: paperName || '',
            userId: userId || null,
            analysis: analysis || null,
            createdAt: Date.now()
        };

        db.createProject(project);

        // Also add to repository if analysis exists
        if (analysis && analysis.logicModule) {
            const repoEntry = {
                id: Math.random().toString(36).substr(2, 9),
                paperName: paperName || '',
                method: analysis.method || '',
                application: analysis.applicationArea || '',
                fuzzySystem: analysis.fuzzySystem || '',
                numberSet: analysis.numberSet || '',
                logicModule: analysis.logicModule,
                userId: userId || null,
                timestamp: Date.now()
            };
            db.addToRepository(repoEntry);
        }

        res.status(201).json(project);
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: error.message || 'Failed to create project' });
    }
});

// PUT /api/projects/:id - Update project
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, analysis } = req.body;

        const existing = db.getProjectById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (analysis !== undefined) updates.analysis = analysis;

        const updated = db.updateProject(id, updates);
        res.json(updated);
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ error: error.message || 'Failed to update project' });
    }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const deleted = db.deleteProject(id);

        if (!deleted) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete project' });
    }
});

// GET /api/projects/repository - Get global methodology repository
router.get('/repository', (req, res) => {
    try {
        const repository = db.getAllRepository();
        res.json(repository);
    } catch (error) {
        console.error('Get repository error:', error);
        res.status(500).json({ error: error.message || 'Failed to get repository' });
    }
});

export default router;
