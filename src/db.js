// db.js

import { createPool } from 'mysql2';

const pool = createPool({
  host: 'localhost:8080',
  user: 'root',
  password: '',
  database: 'webex',
  connectionLimit: 10,
});

export default pool.promise();
