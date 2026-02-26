const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const db = require('./database');
const cronService = require('./cron');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// The backend now only serves API routes.
// Frontend should be served via its own dev server (e.g., npm run dev in /frontend).

// --- ROUTES ---

// 1. Projects Routes
app.get('/api/projects', (req, res) => {
    db.all("SELECT * FROM projects", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/projects', (req, res) => {
    const { name, status, budget_status, completion, methodology, jobs, start_date, end_date, total_manhours } = req.body;
    db.run(
        `INSERT INTO projects (name, status, budget_status, completion, methodology, jobs, start_date, end_date, total_manhours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, status, budget_status, completion, methodology, JSON.stringify(jobs || []), start_date, end_date, total_manhours],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.get('/api/projects/:id/balance', (req, res) => {
    db.get("SELECT total_manhours, methodology FROM projects WHERE id = ?", [req.params.id], (err, project) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!project) return res.status(404).json({ error: "Project not found" });

        db.get("SELECT SUM(estimated_hours) as used_hours FROM tasks WHERE project_id = ?", [req.params.id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                data: {
                    total_manhours: project.total_manhours,
                    methodology: project.methodology,
                    used_hours: row.used_hours || 0,
                    remaining: project.total_manhours !== null ? project.total_manhours - (row.used_hours || 0) : null
                }
            });
        });
    });
});

// 2. Users Routes
app.get('/api/users', (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/users', (req, res) => {
    const { name, role, email, phone_number, status } = req.body;
    db.run(
        `INSERT INTO users (name, role, email, phone_number, status) VALUES (?, ?, ?, ?, ?)`,
        [name, role, email, phone_number, status],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/users/:id', (req, res) => {
    const { name, role, email, phone_number, status } = req.body;
    db.run(
        `UPDATE users SET name = ?, role = ?, email = ?, phone_number = ?, status = ? WHERE id = ?`,
        [name, role, email, phone_number, status, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ changes: this.changes });
        }
    );
});

app.delete('/api/users/:id', (req, res) => {
    db.run(
        `DELETE FROM users WHERE id = ?`,
        req.params.id,
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ deleted: this.changes });
        }
    );
});

// 3. Roles Routes
app.get('/api/roles', (req, res) => {
    db.all("SELECT * FROM roles ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/roles', (req, res) => {
    const { name } = req.body;
    db.run(
        `INSERT INTO roles (name) VALUES (?)`,
        [name],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/roles/:id', (req, res) => {
    const { name } = req.body;
    db.run(
        `UPDATE roles SET name = ? WHERE id = ?`,
        [name, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ changes: this.changes });
        }
    );
});

app.delete('/api/roles/:id', (req, res) => {
    db.run(
        `DELETE FROM roles WHERE id = ?`,
        req.params.id,
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ deleted: this.changes });
        }
    );
});

// 4. Tasks Routes (Kanban)
app.get('/api/tasks', (req, res) => {
    const projectId = req.query.project_id;
    let query = "SELECT * FROM tasks";
    let params = [];

    if (projectId) {
        query += " WHERE project_id = ?";
        params.push(projectId);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/tasks', (req, res) => {
    const { title, feature_title, description, status, priority, project_id, assignee_id, estimated_hours } = req.body;
    const est = parseFloat(estimated_hours) || 0;

    // Validate estimate against project balance
    db.get("SELECT total_manhours, methodology FROM projects WHERE id = ?", [project_id], (err, project) => {
        if (err) return res.status(500).json({ error: err.message });

        if (project && project.methodology === 'Agile Scrum' && project.total_manhours !== null) {
            db.get("SELECT SUM(estimated_hours) as used_hours FROM tasks WHERE project_id = ?", [project_id], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                const currentUsed = row.used_hours || 0;
                if ((currentUsed + est) > project.total_manhours) {
                    return res.status(400).json({
                        error: `Manhours quota exceeded. Remaining balance: ${project.total_manhours - currentUsed} hours.`,
                        remaining: project.total_manhours - currentUsed
                    });
                }
                insertTask();
            });
        } else {
            insertTask();
        }
    });

    function insertTask() {
        db.run(
            `INSERT INTO tasks (title, feature_title, description, status, priority, project_id, assignee_id, estimated_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, feature_title || null, description || null, status, priority, project_id, assignee_id, est],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID });
            }
        );
    }
});

app.put('/api/tasks/:id/status', (req, res) => {
    const { status } = req.body;
    db.run(
        `UPDATE tasks SET status = ? WHERE id = ?`,
        [status, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ changes: this.changes });
        }
    );
});

app.put('/api/tasks/:id', (req, res) => {
    const { title, feature_title, description, status, priority, assignee_id, estimated_hours } = req.body;
    const est = parseFloat(estimated_hours) || 0;

    db.run(
        `UPDATE tasks SET title = ?, feature_title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, estimated_hours = ? WHERE id = ?`,
        [title, feature_title || null, description || null, status, priority, assignee_id, est, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ changes: this.changes });
        }
    );
});

// 4. Manhours Routes
app.get('/api/manhours', (req, res) => {
    const projectId = req.query.project_id;
    let query = `
        SELECT m.id, m.date, m.hours, m.description, u.name as user_name, p.name as project_name
        FROM manhours m
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN projects p ON m.project_id = p.id
    `;
    let params = [];

    if (projectId) {
        query += " WHERE m.project_id = ?";
        params.push(projectId);
    }

    query += " ORDER BY m.date DESC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/manhours', (req, res) => {
    const { user_id, project_id, date, hours, description } = req.body;
    db.run(
        `INSERT INTO manhours (user_id, project_id, date, hours, description) VALUES (?, ?, ?, ?, ?)`,
        [user_id, project_id, date, hours, description],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// General Dashboard Stats
app.get('/api/stats', (req, res) => {
    const stats = {};
    db.get("SELECT COUNT(*) AS totalProjects FROM projects", (err, row) => {
        stats.totalProjects = row ? row.totalProjects : 0;
        db.get("SELECT COUNT(*) AS activeTasks FROM tasks WHERE status != 'Done'", (err, row) => {
            stats.activeTasks = row ? row.activeTasks : 0;
            db.get("SELECT SUM(hours) AS totalHours FROM manhours", (err, row) => {
                stats.totalHours = row && row.totalHours ? row.totalHours : 0;
                res.json({ data: stats });
            });
        });
    });
});

app.get('/api/cron/trigger', (req, res) => {
    cronService.sendNotifications();
    res.json({ message: "Notification job triggered manually." });
});

cronService.scheduleDailyNotifications();

// Removed catch-all route because backend is API-only.

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
