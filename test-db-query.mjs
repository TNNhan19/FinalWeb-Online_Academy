import db from './configs/db.js';

(async () => {
  try {
    const rows = await db.query('SELECT 1 as ok');
    console.log('Query succeeded:', rows);
  } catch (err) {
    console.error('Query failed:', err);
    process.exit(1);
  }
})();
