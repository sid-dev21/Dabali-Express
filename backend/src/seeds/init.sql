-- Database schema for School Canteen Management System

-- Enable UUID extension (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'CANTEEN_MANAGER', 'PARENT', 'STUDENT')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    class_name VARCHAR(50),
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_url TEXT,
    allergies TEXT[], -- Array of allergens
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Menus table
CREATE TABLE IF NOT EXISTS menus (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER')),
    description TEXT,
    items TEXT[], -- JSON array of menu items
    allergens TEXT[], -- Array of allergens present in menu
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, date, meal_type)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('MEAL_TAKEN', 'MEAL_MISSED', 'MENU_APPROVED', 'MENU_REJECTED', 'ABSENCE')),
    related_student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    related_menu_id INTEGER REFERENCES menus(id) ON DELETE SET NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'TRIMESTER')),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'SUSPENDED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    method VARCHAR(20) NOT NULL CHECK (method IN ('ORANGE_MONEY', 'MOOV_MONEY', 'CASH')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    reference VARCHAR(100) UNIQUE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    present BOOLEAN NOT NULL DEFAULT false,
    justified BOOLEAN DEFAULT false,
    reason TEXT,
    marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, menu_id, date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_schools_city ON schools(city);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_menus_school_date ON menus(school_id, date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_student ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_parent ON payments(parent_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_menus_status ON menus(status);

-- Insert initial data
-- Create a super admin user (password: Admin123!)
INSERT INTO users (email, password, role, first_name, last_name, phone) VALUES 
('admin@dabali-express.com', '$2a$10$8K1p/a0dhrxiowP.dnkgNORTWgdEDHn5L2/xjpEWuC.QQv4rKO9jO', 'SUPER_ADMIN', 'Super', 'Admin', '+22670000000')
ON CONFLICT (email) DO NOTHING;

-- Create sample school
INSERT INTO schools (name, address, city) VALUES 
('École Primaire de Ouagadougou', 'Secteur 15', 'Ouagadougou')
ON CONFLICT DO NOTHING;

-- Create sample parent user (password: Parent123!)
INSERT INTO users (email, password, role, first_name, last_name, phone) VALUES 
('parent@example.com', '$2a$10$8K1p/a0dhrxiowP.dnkgNORTWgdEDHn5L2/xjpEWuC.QQv4rKO9jO', 'PARENT', 'Jean', 'Parent', '+22670000001')
ON CONFLICT (email) DO NOTHING;

-- Create sample student
INSERT INTO students (first_name, last_name, class_name, school_id, parent_id) 
SELECT 'Amina', 'Ouedraogo', 'CE2', s.id, u.id 
FROM schools s, users u 
WHERE s.name = 'École Primaire de Ouagadougou' AND u.email = 'parent@example.com'
ON CONFLICT DO NOTHING;

-- Create sample menu
INSERT INTO menus (school_id, date, meal_type, description, items, allergens) 
SELECT s.id, CURRENT_DATE, 'LUNCH', 'Riz sauce tomate', ARRAY['Riz', 'Sauce tomate', 'Poulet', 'Salade'], ARRAY['Gluten', 'Soja']
FROM schools s 
WHERE s.name = 'École Primaire de Ouagadougou'
ON CONFLICT DO NOTHING;