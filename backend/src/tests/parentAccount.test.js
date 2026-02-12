const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../server');

describe('Parent Account API - Tests Unitaires', () => {
  let superAdminToken;
  let schoolAdminToken;
  let schoolId;
  let parentToken;

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

  describe('Configuration Initiale', () => {
    test('Should create super admin and login', async () => {
      // Create super admin directly
      const db = mongoose.connection.db;
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      
      await db.collection('users').insertOne({
        first_name: 'Super',
        last_name: 'Admin',
        email: 'admin@dabali.bf',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Login as super admin
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@dabali.bf',
          password: 'Admin123!'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      
      superAdminToken = loginResponse.body.data.token;
    });

    test('Should create school and school admin', async () => {
      // Create school
      const db = mongoose.connection.db;
      const schoolResult = await db.collection('schools').insertOne({
        name: 'École Test Parent',
        address: '123 Rue Test',
        city: 'Ouagadougou',
        adminName: 'Directeur Test',
        studentCount: 150,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      schoolId = schoolResult.insertedId.toString();

      // Create school admin
      const hashedPassword = await bcrypt.hash('SchoolAdmin123!', 10);
      await db.collection('users').insertOne({
        first_name: 'Directeur',
        last_name: 'Test',
        email: 'director@ecole-test.bf',
        password: hashedPassword,
        role: 'SCHOOL_ADMIN',
        school_id: new mongoose.Types.ObjectId(schoolId),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Login as school admin
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'director@ecole-test.bf',
          password: 'SchoolAdmin123!'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      
      schoolAdminToken = loginResponse.body.data.token;
    });
  });

  describe('POST /api/auth/register - Création de Compte Parent', () => {
    test('Should create parent account successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'awa.traore@gmail.com',
          password: 'Parent123!',
          role: 'PARENT'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Utilisateur créé avec succès');
      expect(response.body.data.user.first_name).toBe('Awa');
      expect(response.body.data.user.last_name).toBe('Traoré');
      expect(response.body.data.user.email).toBe('awa.traore@gmail.com');
      expect(response.body.data.user.role).toBe('PARENT');
      expect(response.body.data.user.password).toBeUndefined(); // Password should be excluded
    });

    test('Should reject duplicate parent email', async () => {
      // Create first parent
      await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'awa.traore@gmail.com',
          password: 'Parent123!',
          role: 'PARENT'
        });

      // Try to create second parent with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Fatou',
          last_name: 'Ouattara',
          email: 'awa.traore@gmail.com',
          password: 'Parent456!',
          role: 'PARENT'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Un utilisateur avec cet email existe déjà');
    });

    test('Should validate required fields for parent registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          // Missing last_name, email, password
          role: 'PARENT'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('requis');
    });

    test('Should validate email format for parent', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'invalid-email',
          password: 'Parent123!',
          role: 'PARENT'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('Should validate password strength for parent', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'awa.traore@gmail.com',
          password: '123', // Too weak
          role: 'PARENT'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('Should reject invalid role for parent registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'awa.traore@gmail.com',
          password: 'Parent123!',
          role: 'INVALID_ROLE'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login - Connexion Parent', () => {
    beforeEach(async () => {
      // Create a parent for testing
      await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'awa.traore@gmail.com',
          password: 'Parent123!',
          role: 'PARENT'
        });
    });

    test('Should login parent successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.traore@gmail.com',
          password: 'Parent123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe('PARENT');
      expect(response.body.data.user.email).toBe('awa.traore@gmail.com');
      expect(response.body.data.user.password).toBeUndefined();

      parentToken = response.body.data.token;
    });

    test('Should reject invalid password for parent', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.traore@gmail.com',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email ou mot de passe incorrect');
    });

    test('Should reject non-existent parent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@gmail.com',
          password: 'Parent123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email ou mot de passe incorrect');
    });

    test('Should validate login fields for parent', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.traore@gmail.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/profile - Profil Parent', () => {
    beforeEach(async () => {
      // Create and login parent
      await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'awa.traore@gmail.com',
          password: 'Parent123!',
          role: 'PARENT'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.traore@gmail.com',
          password: 'Parent123!'
        });

      parentToken = loginResponse.body.data.token;
    });

    test('Should get parent profile successfully', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.first_name).toBe('Awa');
      expect(response.body.data.last_name).toBe('Traoré');
      expect(response.body.data.email).toBe('awa.traore@gmail.com');
      expect(response.body.data.role).toBe('PARENT');
      expect(response.body.data.password).toBeUndefined();
    });

    test('Should reject unauthorized profile access', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('Should reject invalid token for profile access', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/profile - Mise à Jour Profil Parent', () => {
    beforeEach(async () => {
      // Create and login parent
      await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'awa.traore@gmail.com',
          password: 'Parent123!',
          role: 'PARENT'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.traore@gmail.com',
          password: 'Parent123!'
        });

      parentToken = loginResponse.body.data.token;
    });

    test('Should update parent profile successfully', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          first_name: 'Awa Mariam',
          last_name: 'Traoré',
          phone: '+22670123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.first_name).toBe('Awa Mariam');
      expect(response.body.data.last_name).toBe('Traoré');
      expect(response.body.data.phone).toBe('+22670123456');
    });

    test('Should reject email update through profile', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          email: 'new.email@gmail.com'
        });

      // Email should not be updatable through profile endpoint
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('Should reject role update through profile', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          role: 'SCHOOL_ADMIN'
        });

      // Role should not be updatable through profile endpoint
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/change-password - Changement Mot de Passe Parent', () => {
    beforeEach(async () => {
      // Create and login parent
      await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'awa.traore@gmail.com',
          password: 'Parent123!',
          role: 'PARENT'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.traore@gmail.com',
          password: 'Parent123!'
        });

      parentToken = loginResponse.body.data.token;
    });

    test('Should change parent password successfully', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          currentPassword: 'Parent123!',
          newPassword: 'NewParentPass456!',
          confirmPassword: 'NewParentPass456!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mot de passe changé avec succès');

      // Test login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.traore@gmail.com',
          password: 'NewParentPass456!'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
    });

    test('Should reject incorrect current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewParentPass456!',
          confirmPassword: 'NewParentPass456!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Le mot de passe actuel est incorrect');
    });

    test('Should reject password mismatch', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          currentPassword: 'Parent123!',
          newPassword: 'NewParentPass456!',
          confirmPassword: 'DifferentPass789!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Le nouveau mot de passe et la confirmation ne correspondent pas');
    });

    test('Should validate required fields for password change', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          currentPassword: 'Parent123!'
          // Missing newPassword and confirmPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Permissions et Sécurité', () => {
    test('Parent should not access canteen manager endpoints', async () => {
      // Create and login parent
      await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'awa.traore@gmail.com',
          password: 'Parent123!',
          role: 'PARENT'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.traore@gmail.com',
          password: 'Parent123!'
        });

      parentToken = loginResponse.body.data.token;

      // Try to access canteen manager creation
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          first_name: 'Test',
          last_name: 'Manager',
          email: 'test.manager@gmail.com',
          phone: '+22670333333',
          school_id: schoolId
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('Parent should not access school admin endpoints', async () => {
      // Create and login parent
      await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'awa.traore@gmail.com',
          password: 'Parent123!',
          role: 'PARENT'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.traore@gmail.com',
          password: 'Parent123!'
        });

      parentToken = loginResponse.body.data.token;

      // Try to access school creation
      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          name: 'École Non Autorisée',
          address: '123 Rue Test',
          city: 'Ouagadougou'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});
