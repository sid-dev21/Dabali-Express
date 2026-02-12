const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../server');

describe('Canteen Manager API - Tests Unitaires Améliorés', () => {
  let superAdminToken;
  let schoolAdminToken;
  let schoolId;
  let canteenManagerToken;
  let temporaryPassword;

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
        name: 'École Test Cantine',
        address: '456 Avenue Cantine',
        city: 'Ouagadougou',
        adminName: 'Directeur Cantine',
        studentCount: 200,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      schoolId = schoolResult.insertedId.toString();

      // Create school admin
      const hashedPassword = await bcrypt.hash('SchoolAdmin123!', 10);
      await db.collection('users').insertOne({
        first_name: 'Directeur',
        last_name: 'Cantine',
        email: 'director@ecole-cantine.bf',
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
          email: 'director@ecole-cantine.bf',
          password: 'SchoolAdmin123!'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      
      schoolAdminToken = loginResponse.body.data.token;
    });
  });

  describe('POST /api/users/canteen-managers - Création de Gestionnaire de Cantine', () => {
    test('Should create canteen manager successfully', async () => {
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Moussa',
          last_name: 'Traoré',
          email: 'moussa.traore@gmail.com',
          phone: '+22670333333',
          school_id: schoolId
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Gestionnaire de cantine créé avec succès.');
      expect(response.body.data.user.first_name).toBe('Moussa');
      expect(response.body.data.user.last_name).toBe('Traoré');
      expect(response.body.data.user.email).toBe('moussa.traore@gmail.com');
      expect(response.body.data.user.phone).toBe('+22670333333');
      expect(response.body.data.user.role).toBe('CANTEEN_MANAGER');
      expect(response.body.data.temporary_password).toBeDefined();
      expect(response.body.data.temporary_password).toMatch(/^[A-Za-z0-9!@#$%^&*]{12}$/);
    });

    test('Should enforce gmail email requirement', async () => {
      const invalidEmails = [
        'moussa.traore@yahoo.com',
        'moussa.traore@hotmail.com',
        'moussa.traore@school.bf',
        'moussa.traore@orange.bf',
        'moussa.traore@test.org',
        'moussa.traore@outlook.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/users/canteen-managers')
          .set('Authorization', `Bearer ${schoolAdminToken}`)
          .send({
            first_name: 'Moussa',
            last_name: 'Traoré',
            email: email,
            phone: '+22670333333',
            school_id: schoolId
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Seuls les emails se terminant par @gmail.com sont autorisés.');
      }
    });

    test('Should accept valid gmail emails', async () => {
      const validEmails = [
        'moussa.traore@gmail.com',
        'test.manager@gmail.com',
        'canteen.staff@gmail.com'
      ];

      for (const email of validEmails) {
        const response = await request(app)
          .post('/api/users/canteen-managers')
          .set('Authorization', `Bearer ${schoolAdminToken}`)
          .send({
            first_name: 'Test',
            last_name: 'Manager',
            email: email,
            phone: '+22670333334',
            school_id: schoolId
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(email);
      }
    });

    test('Should reject duplicate email', async () => {
      // Create first manager
      await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Moussa',
          last_name: 'Traoré',
          email: 'moussa.traore@gmail.com',
          phone: '+22670333333',
          school_id: schoolId
        });

      // Try to create second manager with same email
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Alassane',
          last_name: 'Ouedraogo',
          email: 'moussa.traore@gmail.com',
          phone: '+22670444444',
          school_id: schoolId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Un utilisateur avec cet email existe déjà.');
    });

    test('Should validate required fields', async () => {
      const requiredFields = [
        { field: 'first_name', message: 'Prénom, nom, email et école sont requis.' },
        { field: 'last_name', message: 'Prénom, nom, email et école sont requis.' },
        { field: 'email', message: 'Prénom, nom, email et école sont requis.' },
        { field: 'school_id', message: 'Prénom, nom, email et école sont requis.' }
      ];

      for (const { field } of requiredFields) {
        const response = await request(app)
          .post('/api/users/canteen-managers')
          .set('Authorization', `Bearer ${schoolAdminToken}`)
          .send({
            first_name: field === 'first_name' ? undefined : 'Moussa',
            last_name: field === 'last_name' ? undefined : 'Traoré',
            email: field === 'email' ? undefined : 'moussa.traore@gmail.com',
            phone: '+22670333333',
            school_id: field === 'school_id' ? undefined : schoolId
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('Should validate phone number format', async () => {
      const invalidPhones = [
        '70333333', // Missing country code
        '+2267033333', // Too short
        '+226703333333', // Too long
        '22670333333', // Missing +
        'phone123', // Invalid format
        '+226 70 33 33 33' // Spaces not allowed
      ];

      for (const phone of invalidPhones) {
        const response = await request(app)
          .post('/api/users/canteen-managers')
          .set('Authorization', `Bearer ${schoolAdminToken}`)
          .send({
            first_name: 'Moussa',
            last_name: 'Traoré',
            email: 'moussa.traore@gmail.com',
            phone: phone,
            school_id: schoolId
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('Should accept valid phone numbers', async () => {
      const validPhones = [
        '+22670333333',
        '+22671234567',
        '+22660987654'
      ];

      for (const phone of validPhones) {
        const response = await request(app)
          .post('/api/users/canteen-managers')
          .set('Authorization', `Bearer ${schoolAdminToken}`)
          .send({
            first_name: 'Test',
            last_name: 'Manager',
            email: `test.manager.${Date.now()}@gmail.com`,
            phone: phone,
            school_id: schoolId
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }
    });

    test('Should reject unauthorized access', async () => {
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .send({
          first_name: 'Moussa',
          last_name: 'Traoré',
          email: 'moussa.traore@gmail.com',
          phone: '+22670333333',
          school_id: schoolId
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('Should reject access from non-school admin roles', async () => {
      // Create parent and try to create canteen manager
      await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'awa.traore@gmail.com',
          password: 'Parent123!',
          role: 'PARENT'
        });

      const parentLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.traore@gmail.com',
          password: 'Parent123!'
        });

      const parentToken = parentLoginResponse.body.data.token;

      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          first_name: 'Moussa',
          last_name: 'Traoré',
          email: 'moussa.traore@gmail.com',
          phone: '+22670333333',
          school_id: schoolId
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login - Connexion Gestionnaire de Cantine', () => {
    beforeEach(async () => {
      // Create canteen manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Moussa',
          last_name: 'Traoré',
          email: 'moussa.traore@gmail.com',
          phone: '+22670333333',
          school_id: schoolId
        });

      temporaryPassword = createResponse.body.data.temporary_password;
    });

    test('Should login with temporary password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'moussa.traore@gmail.com',
          password: temporaryPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe('CANTEEN_MANAGER');
      expect(response.body.data.user.email).toBe('moussa.traore@gmail.com');
      expect(response.body.data.user.password).toBeUndefined();

      canteenManagerToken = response.body.data.token;
    });

    test('Should reject incorrect temporary password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'moussa.traore@gmail.com',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email ou mot de passe incorrect');
    });
  });

  describe('POST /api/auth/change-temporary-password - Changement Mot de Passe Temporaire', () => {
    beforeEach(async () => {
      // Create canteen manager and login
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Moussa',
          last_name: 'Traoré',
          email: 'moussa.traore@gmail.com',
          phone: '+22670333333',
          school_id: schoolId
        });

      temporaryPassword = createResponse.body.data.temporary_password;

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'moussa.traore@gmail.com',
          password: temporaryPassword
        });

      canteenManagerToken = loginResponse.body.data.token;
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

      // Test login with new password
      const newLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'moussa.traore@gmail.com',
          password: 'NewSecurePass123!'
        });

      expect(newLoginResponse.status).toBe(200);
      expect(newLoginResponse.body.success).toBe(true);
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
          confirm_password: 'DifferentPass789!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Le nouveau mot de passe et la confirmation ne correspondent pas.');
    });

    test('Should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/change-temporary-password')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          current_password: temporaryPassword
          // Missing new_password and confirm_password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('Should validate new password strength', async () => {
      const weakPasswords = [
        '123', // Too short
        'password', // Too common
        '11111111', // All same characters
        'weak' // Too short and weak
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/change-temporary-password')
          .set('Authorization', `Bearer ${canteenManagerToken}`)
          .send({
            current_password: temporaryPassword,
            new_password: weakPassword,
            confirm_password: weakPassword
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('GET /api/users/canteen-managers/school/:school_id - Liste des Gestionnaires', () => {
    let managerId;

    beforeEach(async () => {
      // Create canteen manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Moussa',
          last_name: 'Traoré',
          email: 'moussa.traore@gmail.com',
          phone: '+22670333333',
          school_id: schoolId
        });

      managerId = createResponse.body.data.user.id;
    });

    test('Should get canteen managers for school', async () => {
      const response = await request(app)
        .get(`/api/users/canteen-managers/school/${schoolId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].first_name).toBe('Moussa');
      expect(response.body.data[0].last_name).toBe('Traoré');
      expect(response.body.data[0].email).toBe('moussa.traore@gmail.com');
      expect(response.body.data[0].role).toBe('CANTEEN_MANAGER');
      expect(response.body.data[0].password).toBeUndefined(); // Password should be excluded
    });

    test('Should reject unauthorized access', async () => {
      const response = await request(app)
        .get(`/api/users/canteen-managers/school/${schoolId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('Should return empty array for school with no managers', async () => {
      // Create another school
      const db = mongoose.connection.db;
      const newSchoolResult = await db.collection('schools').insertOne({
        name: 'École Sans Cantine',
        address: '789 Rue Vide',
        city: 'Bobo-Dioulasso',
        adminName: 'Directeur Vide',
        studentCount: 50,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const newSchoolId = newSchoolResult.insertedId.toString();

      const response = await request(app)
        .get(`/api/users/canteen-managers/school/${newSchoolId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('POST /api/users/canteen-managers/:id/reset-password - Réinitialisation Mot de Passe', () => {
    let managerId;

    beforeEach(async () => {
      // Create canteen manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Moussa',
          last_name: 'Traoré',
          email: 'moussa.traore@gmail.com',
          phone: '+22670333333',
          school_id: schoolId
        });

      managerId = createResponse.body.data.user.id;
    });

    test('Should reset password successfully', async () => {
      const response = await request(app)
        .post(`/api/users/canteen-managers/${managerId}/reset-password`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mot de passe réinitialisé avec succès.');
      expect(response.body.data.temporary_password).toBeDefined();
      expect(response.body.data.temporary_password).toMatch(/^[A-Za-z0-9!@#$%^&*]{12}$/);

      // Test login with new temporary password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'moussa.traore@gmail.com',
          password: response.body.data.temporary_password
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
    });

    test('Should reject non-existent manager', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post(`/api/users/canteen-managers/${fakeId}/reset-password`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Gestionnaire de cantine non trouvé.');
    });

    test('Should reject unauthorized access', async () => {
      const response = await request(app)
        .post(`/api/users/canteen-managers/${managerId}/reset-password`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/users/canteen-managers/:id - Suppression Gestionnaire', () => {
    let managerId;

    beforeEach(async () => {
      // Create canteen manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Moussa',
          last_name: 'Traoré',
          email: 'moussa.traore@gmail.com',
          phone: '+22670333333',
          school_id: schoolId
        });

      managerId = createResponse.body.data.user.id;
    });

    test('Should delete canteen manager successfully', async () => {
      const response = await request(app)
        .delete(`/api/users/canteen-managers/${managerId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Gestionnaire de cantine supprimé avec succès.');

      // Verify manager was deleted
      const getResponse = await request(app)
        .get(`/api/users/canteen-managers/school/${schoolId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(getResponse.body.data.length).toBe(0);
    });

    test('Should reject non-existent manager', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/api/users/canteen-managers/${fakeId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Gestionnaire de cantine non trouvé.');
    });

    test('Should reject unauthorized access', async () => {
      const response = await request(app)
        .delete(`/api/users/canteen-managers/${managerId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Permissions et Sécurité Avancées', () => {
    test('Canteen manager should not access other school managers', async () => {
      // Create second school and admin
      const db = mongoose.connection.db;
      const secondSchoolResult = await db.collection('schools').insertOne({
        name: 'École Deux',
        address: '123 Rue Deux',
        city: 'Koudougou',
        adminName: 'Directeur Deux',
        studentCount: 100,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const secondSchoolId = secondSchoolResult.insertedId.toString();

      const hashedPassword = await bcrypt.hash('SchoolAdmin456!', 10);
      await db.collection('users').insertOne({
        first_name: 'Directeur',
        last_name: 'Deux',
        email: 'director@ecole-deux.bf',
        password: hashedPassword,
        role: 'SCHOOL_ADMIN',
        school_id: new mongoose.Types.ObjectId(secondSchoolId),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const secondAdminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'director@ecole-deux.bf',
          password: 'SchoolAdmin456!'
        });

      const secondAdminToken = secondAdminLoginResponse.body.data.token;

      // Create canteen manager in first school
      await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Moussa',
          last_name: 'Traoré',
          email: 'moussa.traore@gmail.com',
          phone: '+22670333333',
          school_id: schoolId
        });

      // Try to access managers from first school with second school admin
      const response = await request(app)
        .get(`/api/users/canteen-managers/school/${schoolId}`)
        .set('Authorization', `Bearer ${secondAdminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('Should validate school_id belongs to admin', async () => {
      // Create second school
      const db = mongoose.connection.db;
      const secondSchoolResult = await db.collection('schools').insertOne({
        name: 'École Non Autorisée',
        address: '999 Rue Interdite',
        city: 'Banfora',
        adminName: 'Directeur Interdit',
        studentCount: 75,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const unauthorizedSchoolId = secondSchoolResult.insertedId.toString();

      // Try to create canteen manager in unauthorized school
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Moussa',
          last_name: 'Traoré',
          email: 'moussa.traore@gmail.com',
          phone: '+22670333333',
          school_id: unauthorizedSchoolId
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});
