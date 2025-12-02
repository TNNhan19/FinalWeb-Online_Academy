import('./configs/db.js')
  .then(() => console.log('DB module loaded OK'))
  .catch(err => { console.error('DB module failed to load:', err); process.exit(1); });
