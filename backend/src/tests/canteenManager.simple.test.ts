import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server';

// Simple test without strict typing to avoid Mongoose type issues
describe('Canteen Manager API - Basic Tests', () => {
  let schoolAdminToken: string;
  let schoolId: string;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/dabali-test');
  });

  afterAll(async () => {
    // Clean up and disconnect
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
  });

  describe('Health Check', () => {
    test('Should respond to health check', async () => {
      const response = await request(app)
        .get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('API is running');
    });
  });

  describe('Authentication Setup', () => {
    test('Should create school admin and login', async () => {
      // Create school first (direct DB insertion to avoid type issues)
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');
      
      const schoolResult = await db.collection('schools').insertOne({
        name: 'École Primaire de Ouagadougou',
        address: '123 Rue Test',
        city: 'Ouagadougou',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      schoolId = schoolResult.insertedId.toString();

      // Create school admin (direct DB insertion)
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      
      const adminResult = await db.collection('users').insertOne({
        first_name: 'Koné',
        last_name: 'Ibrahim',
        email: 'kone.ibrahim@school.bf',
        password: hashedPassword,
        role: 'SCHOOL_ADMIN',
        school_id: new mongoose.Types.ObjectId(schoolId),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Login as admin
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'kone.ibrahim@school.bf',
          password: 'Admin123!'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      
      schoolAdminToken = loginResponse.body.data.token;
    });
  });

  describe('Canteen Manager Creation', () => {
    test('Should create canteen manager successfully', async () => {
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Traoré',
          last_name: 'Moussa',
          email: 'moussa.traore@school.bf',
          phone: '+22670333333',
          school_id: schoolId
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Gestionnaire de cantine créé avec succès.');
      expect(response.body.data.user.first_name).toBe('Traoré');
      expect(response.body.data.user.last_name).toBe('Moussa');
      expect(response.body.data.user.email).toBe('moussa.traore@school.bf');
      expect(response.body.data.user.role).toBe('CANTEEN_MANAGER');
      expect(response.body.data.temporary_password).toBeDefined();
      expect(response.body.data.temporary_password).toMatch(/^[A-Za-z0-9!@#$%^&*]{12}$/);
    });

    test('Should reject duplicate email', async () => {
      // Create first manager
      await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Traoré',
          last_name: 'Moussa',
          email: 'moussa.traore@school.bf',
          phone: '+22670333333',
          school_id: schoolId
        });

      // Try to create second manager with same email
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Ouedraogo',
          last_name: 'Alassane',
          email: 'moussa.traore@school.bf',
          phone: '+22670444444',
          school_id: schoolId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Un utilisateur avec cet email existe déjà.');
    });

    test('Should validate required fields', async () => {
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Traoré',
          // Missing last_name, email, school_id
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Prénom, nom, email et école sont requis.');
    });

    test('Should reject unauthorized access', async () => {
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .send({
          first_name: 'Traoré',
          last_name: 'Moussa',
          email: 'moussa.traore@school.bf',
          phone: '+22670333333',
          school_id: schoolId
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Canteen Manager Login and Password Change', () => {
    let canteenManagerToken: string;
    let temporaryPassword: string;

    beforeEach(async () => {
      // Create a canteen manager with temporary password
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Traoré',
          last_name: 'Moussa',
          email: 'moussa.traore@school.bf',
          phone: '+22670333333',
          school_id: schoolId
        });

      temporaryPassword = response.body.data.temporary_password;

      // Login as canteen manager
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'moussa.traore@school.bf',
          password: temporaryPassword
        });

      canteenManagerToken = loginResponse.body.data.token;
    });

    test('Should login with temporary password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'moussa.traore@school.bf',
          password: temporaryPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    test('Should change temporary password successfully', async () => {
      const response = await request(app)
        .post('/api/auth/change-temporary-password')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          current_password: temporaryPassword,
          new_password: 'NewSecurePass123!',
          confirm_password: 'NewSecurePass123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mot de passe changé avec succès. Vous pouvez maintenant utiliser l\'application normalement.');
    });

    test('Should reject incorrect current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-temporary-password')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          current_password: 'WrongPassword123!',
          new_password: 'NewSecurePass123!',
          confirm_password: 'NewSecurePass123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Le mot de passe actuel est incorrect.');
    });

    test('Should reject password mismatch', async () => {
      const response = await request(app)
        .post('/api/auth/change-temporary-password')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          current_password: temporaryPassword,
          new_password: 'NewSecurePass123!',
          confirm_password: 'DifferentPass123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Le nouveau mot de passe et la confirmation ne correspondent pas.');
    });
  });
});
