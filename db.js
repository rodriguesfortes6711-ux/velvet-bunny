// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: {
        rejectUnauthorized: false // Necessário para conexões externas (Neon, Supabase, etc.)
    }
});

module.exports = pool;