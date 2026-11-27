'use strict';
const { createApp } = require('./app');
const store = require('./store');

store.load();
const port = Number(process.env.PORT) || 3000;
createApp().listen(port, () => console.log(`Care Taker running at http://localhost:${port}`));
