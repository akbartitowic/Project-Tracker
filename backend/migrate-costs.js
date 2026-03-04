const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        return;
    }
    console.log('Connected to the SQLite database for cost migration.');

    db.serialize(() => {
        db.run('ALTER TABLE projects ADD COLUMN hourly_rate REAL', (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log('Column hourly_rate already exists. Skipping.');
                } else {
                    console.error('Error adding hourly_rate:', err.message);
                }
            } else {
                console.log('Added hourly_rate to projects table.');
            }
        });

        db.run('ALTER TABLE projects ADD COLUMN total_cost REAL', (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log('Column total_cost already exists. Skipping.');
                } else {
                    console.error('Error adding total_cost:', err.message);
                }
            } else {
                console.log('Added total_cost to projects table.');
            }
        });

        // Add timeout to flush safely
        setTimeout(() => {
            console.log("Migration finished.");
            db.close();
        }, 1500);
    });
});
