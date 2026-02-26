const cron = require('node-cron');
const db = require('./database');
const { sendWhatsAppMessage } = require('./services/whatsapp');

// Runs every day at 08:00 AM. 
// For testing purposes, you can change this to '* * * * *' to run every minute.
const scheduleDailyNotifications = () => {
    console.log('[CRON] Notification scheduler initialized. Runs daily at 08:00 AM.');
    cron.schedule('0 8 * * *', () => {
        console.log('[CRON] Starting daily task notification job...');
        sendNotifications();
    });
};

const sendNotifications = () => {
    // Query users with pending tasks
    const query = `
        SELECT u.id, u.name, u.phone_number, p.name as project_name, COUNT(t.id) as pending_count
        FROM users u
        JOIN tasks t ON u.id = t.assignee_id
        JOIN projects p ON t.project_id = p.id
        WHERE t.status IN ('To Do', 'In Progress', 'Review') AND u.phone_number IS NOT NULL AND u.phone_number != ''
        GROUP BY u.id, p.id
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('[CRON] Error querying pending tasks:', err.message);
            return;
        }

        if (!rows || rows.length === 0) {
            console.log('[CRON] No pending tasks found for users with phone numbers.');
            return;
        }

        rows.forEach(row => {
            const message = `Halo ${row.name}, Anda memiliki ${row.pending_count} task yang masih pending hari ini di proyek ${row.project_name}. Mohon segera diselesaikan atau update statusnya. Terima kasih.`;
            sendWhatsAppMessage(row.phone_number, message);
        });
    });
};

module.exports = {
    scheduleDailyNotifications,
    sendNotifications // Exported for easy manual triggering during tests
};
