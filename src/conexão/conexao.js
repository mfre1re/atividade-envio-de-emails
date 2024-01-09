const { Pool } = require('pg')

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'newsletter',
    user: 'postgres',
    password: '8980028'
})

module.exports = pool
