const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // Initialize tables
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                status TEXT NOT NULL,
                budget_status TEXT NOT NULL,
                completion INTEGER NOT NULL,
                methodology TEXT,
                jobs TEXT,
                start_date TEXT,
                end_date TEXT,
                total_manhours INTEGER,
                hourly_rate REAL,
                total_cost REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone_number TEXT,
                status TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                title TEXT NOT NULL,
                feature_title TEXT,
                description TEXT,
                status TEXT NOT NULL,
                priority TEXT NOT NULL,
                assignee_id INTEGER,
                estimated_hours REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id),
                FOREIGN KEY (assignee_id) REFERENCES users(id)
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS manhours (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                project_id INTEGER,
                date TEXT NOT NULL,
                hours REAL NOT NULL,
                amount_idr REAL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (project_id) REFERENCES projects(id)
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS project_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS project_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                project_role_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (project_role_id) REFERENCES project_roles(id) ON DELETE CASCADE,
                UNIQUE(project_id, user_id, project_role_id)
            )`);

            // Insert default roles if table is empty
            db.get("SELECT COUNT(*) AS count FROM roles", (err, row) => {
                if (row && row.count === 0) {
                    const insertRole = db.prepare("INSERT INTO roles (name) VALUES (?)");
                    const defaultRoles = ['Admin', 'Project Manager', 'Developer', 'Designer'];
                    defaultRoles.forEach(r => insertRole.run(r));
                    insertRole.finalize();
                    console.log("Inserted initial roles.");
                }
            });

            // Insert default project roles if table is empty
            db.get("SELECT COUNT(*) AS count FROM project_roles", (err, row) => {
                if (row && row.count === 0) {
                    const insertProjectRole = db.prepare("INSERT INTO project_roles (name) VALUES (?)");
                    const defaultProjectRoles = ['UI/UX Designer', 'Frontend Dev', 'Backend Dev', 'System Analyst', 'QA Engineer', 'Product Manager'];
                    defaultProjectRoles.forEach(r => insertProjectRole.run(r));
                    insertProjectRole.finalize();
                    console.log("Inserted initial project roles.");
                }
            });

            // Insert some initial dummy data if users table is empty
            db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
                if (row.count === 0) {
                    const insertUser = db.prepare("INSERT INTO users (name, role, email, phone_number, status) VALUES (?, ?, ?, ?, ?)");
                    insertUser.run("Jane Doe", "Project Manager", "jane@example.com", "081234567890", "Active");
                    insertUser.run("John Smith", "Developer", "john@example.com", "089876543210", "Active");
                    insertUser.finalize();
                    console.log("Inserted initial users.");
                }
            });

            db.get("SELECT COUNT(*) AS count FROM projects", (err, row) => {
                if (row.count === 0) {
                    const insertProject = db.prepare("INSERT INTO projects (name, status, budget_status, completion, methodology, jobs, start_date, end_date, total_manhours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    insertProject.run("Website Redesign", "In Progress", "On Budget", 65, "Agile Scrum", '["UI/UX", "FE", "BE"]', "2023-10-01", "2023-12-31", 1200);
                    insertProject.run("Mobile App Dev", "Planning", "Under Budget", 15, "Agile Scrum", '["FE", "QA"]', "2023-11-01", "2024-03-01", 800);
                    insertProject.run("Marketing Campaign", "Completed", "Over Budget", 100, "Waterfall", '["UI/UX"]', "2023-01-01", "2023-06-30", null);
                    insertProject.finalize();
                    console.log("Inserted initial projects.");
                }
            });
        });
    }
});

module.exports = db;
