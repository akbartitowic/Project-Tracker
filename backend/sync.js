const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        return;
    }
    console.log('Connected to the SQLite database for migration.');

    db.serialize(() => {
        // 1. Sync User Roles
        db.all("SELECT * FROM users", [], (err, users) => {
            if (err) throw err;

            const updateUserRole = db.prepare("UPDATE users SET role = ? WHERE id = ?");
            users.forEach(u => {
                let newRole = u.role;
                if (u.role === 'Project Manager') newRole = 'Product Manager';
                if (u.role === 'Developer') newRole = 'Backend Dev';
                if (u.role === 'Designer') newRole = 'UI/UX Designer';
                if (u.role === 'QA') newRole = 'QA Engineer';

                if (newRole !== u.role) {
                    updateUserRole.run(newRole, u.id);
                    console.log(`Updated user ${u.name} (ID: ${u.id}) from '${u.role}' to '${newRole}'`);
                }
            });
            updateUserRole.finalize();
        });

        // 2. Sync Project Members for old projects (IDs 1-5)
        db.all("SELECT id FROM projects WHERE id <= 5", [], (err, projects) => {
            if (err) throw err;

            db.all("SELECT * FROM project_members", [], (err, existingMembers) => {
                if (err) throw err;

                const insertMember = db.prepare("INSERT OR IGNORE INTO project_members (project_id, user_id, project_role_id) VALUES (?, ?, ?)");

                projects.forEach(p => {
                    const hasMembers = existingMembers.some(em => em.project_id === p.id);
                    if (!hasMembers) {
                        // Assuming Master Roles: Product Manager(6), Backend Dev(3), Frontend Dev(2), UI/UX (1) depending on DB IDs.
                        // We will just fetch the Product Manager and Backend Dev IDs directly first.
                        db.get("SELECT id FROM project_roles WHERE name = 'Product Manager'", (err, pmRole) => {
                            if (pmRole) {
                                insertMember.run(p.id, 1, pmRole.id); // Jane Doe
                                console.log(`Added User 1 (Jane) to Project ${p.id} as Product Manager`);
                            }
                        });
                        db.get("SELECT id FROM project_roles WHERE name = 'Backend Dev'", (err, beRole) => {
                            if (beRole) {
                                insertMember.run(p.id, 2, beRole.id); // John Smith
                                console.log(`Added User 2 (John) to Project ${p.id} as Backend Dev`);
                            }
                        });
                    }
                });

                // insertMember.finalize() delayed safely due to serialize but we'll wait 2 seconds and close
                setTimeout(() => {
                    console.log("Migration complete.");
                    db.close();
                }, 2000);
            });
        });
    });
});
