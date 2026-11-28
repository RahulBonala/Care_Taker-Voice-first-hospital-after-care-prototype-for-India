'use strict';
require('../scripts/copy-assets');
const { createApp } = require('./app');
const store = require('./store');

store.load();
const port = Number(process.env.PORT) || 3000;
const server = createApp().listen(port, () => console.log(`Care Taker running at http://localhost:${port}`));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
