/* Database configuration file */

import {Pool} from 'pg';
import dotenv from 'dotenv';


// Load environment variables from .env file
dotenv.config();

// Configuration for PostgreSQL connection
// Data is sourced from environment variables for security
const pool = new Pool({
    host: process.env.DB_HOST || process.env.DB_Host || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'canteen_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password123',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
})


// Event listener: log when a new client is connected

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

// Event listener: log errors on the pool
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Helper function for testing the database connection

export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database time:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

export default pool;