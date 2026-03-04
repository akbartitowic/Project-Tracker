const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        return;
    }
    console.log('Connected to the SQLite database for manhours IDR migration.');

    db.serialize(() => {
        db.run('ALTER TABLE manhours ADD COLUMN amount_idr REAL', (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log('Column amount_idr already exists. Skipping.');
                } else {
                    console.error('Error adding amount_idr:', err.message);
                }
            } else {
                console.log('Added amount_idr to manhours table.');
            }
        });

        // Add timeout to flush safely
        setTimeout(() => {
            console.log("Migration finished.");
            db.close();
        }, 1500);
    });
});
