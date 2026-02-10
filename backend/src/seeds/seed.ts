#!/usr/bin/env node

/**
 * Database seeding script
 * This script initializes the database with tables and sample data
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Database configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'canteen_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password123',
});

async function seedDatabase() {
    console.log('Starting database seeding...');
    
    try {
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'init.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Execute the entire SQL file as one transaction
        console.log('Executing complete SQL script...');
        await pool.query(sqlContent);
        
        console.log('Database seeding completed successfully!');
        
        // Test the connection by querying the users table
        const result = await pool.query('SELECT COUNT(*) FROM users');
        console.log(`Users table contains ${result.rows[0].count} records`);
        
        const schoolsResult = await pool.query('SELECT COUNT(*) FROM schools');
        console.log(`Schools table contains ${schoolsResult.rows[0].count} records`);
        
    } catch (error) {
        console.error('Error seeding database:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the seeding script
if (require.main === module) {
    seedDatabase()
        .then(() => {
            console.log('Seeding process finished.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seeding process failed:', error);
            process.exit(1);
        });
}

export default seedDatabase;