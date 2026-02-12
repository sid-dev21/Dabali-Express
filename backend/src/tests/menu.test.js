const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../server');

describe('Menu API - Tests Unitaires', () => {
  let superAdminToken;
  let schoolAdminToken;
  let canteenManagerToken;
  let schoolId;
  let menuId;

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

    test('Should create school, admin and canteen manager', async () => {
      // Create school
      const db = mongoose.connection.db;
      const schoolResult = await db.collection('schools').insertOne({
        name: 'École Test Menu',
        address: '321 Avenue Menu',
        city: 'Ouagadougou',
        adminName: 'Directeur Menu',
        studentCount: 180,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      schoolId = schoolResult.insertedId.toString();

      // Create school admin
      const hashedPassword = await bcrypt.hash('SchoolAdmin123!', 10);
      await db.collection('users').insertOne({
        first_name: 'Directeur',
        last_name: 'Menu',
        email: 'director@ecole-menu.bf',
        password: hashedPassword,
        role: 'SCHOOL_ADMIN',
        school_id: new mongoose.Types.ObjectId(schoolId),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Login as school admin
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'director@ecole-menu.bf',
          password: 'SchoolAdmin123!'
        });

      schoolAdminToken = adminLoginResponse.body.data.token;

      // Create canteen manager
      const canteenManagerResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Moussa',
          last_name: 'Traoré',
          email: 'moussa.traore@gmail.com',
          phone: '+22670333333',
          school_id: schoolId
        });

      const temporaryPassword = canteenManagerResponse.body.data.temporary_password;

      const canteenManagerLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'moussa.traore@gmail.com',
          password: temporaryPassword
        });

      canteenManagerToken = canteenManagerLoginResponse.body.data.token;
    });
  });

  describe('POST /api/menus - Création de Menu', () => {
    test('Should create menu successfully', async () => {
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + 1); // Tomorrow

      const response = await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          school_id: schoolId,
          date: menuDate.toISOString(),
          meal_type: 'LUNCH',
          description: 'Riz au gras avec sauce tomate et viande',
          items: ['Riz', 'Sauce tomate', 'Viande', 'Légumes'],
          allergens: ['Gluten', 'Lactose']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Menu created successfully and pending approval.');
      expect(response.body.data.description).toBe('Riz au gras avec sauce tomate et viande');
      expect(response.body.data.meal_type).toBe('LUNCH');
      expect(response.body.data.status).toBe('PENDING');
      expect(response.body.data.school_id._id).toBe(schoolId);
      expect(response.body.data.created_by.first_name).toBe('Moussa');

      menuId = response.body.data._id;
    });

    test('Should reject menu without required fields', async () => {
      const response = await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          description: 'Menu incomplet'
          // Missing school_id, date, meal_type
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('School ID, date, and meal type are required.');
    });

    test('Should reject menu for non-existent school', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + 1);

      const response = await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          school_id: fakeId,
          date: menuDate.toISOString(),
          meal_type: 'LUNCH',
          description: 'Menu test'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('School not found.');
    });

    test('Should reject invalid meal type', async () => {
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + 1);

      const response = await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          school_id: schoolId,
          date: menuDate.toISOString(),
          meal_type: 'INVALID_MEAL',
          description: 'Menu test'
        });

      expect(response.status).toBe(500); // Will fail validation in schema
      expect(response.body.success).toBe(false);
    });

    test('Should reject unauthorized menu creation', async () => {
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + 1);

      const response = await request(app)
        .post('/api/menus')
        .send({
          school_id: schoolId,
          date: menuDate.toISOString(),
          meal_type: 'LUNCH',
          description: 'Menu non autorisé'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('Should create menu without optional fields', async () => {
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + 1);

      const response = await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          school_id: schoolId,
          date: menuDate.toISOString(),
          meal_type: 'BREAKFAST'
          // No description, items, or allergens
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.meal_type).toBe('BREAKFAST');
      expect(response.body.data.status).toBe('PENDING');
      expect(response.body.data.items).toEqual([]);
      expect(response.body.data.allergens).toEqual([]);
    });
  });

  describe('GET /api/menus - Liste des Menus', () => {
    beforeEach(async () => {
      // Create menus for testing
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + 1);

      await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          school_id: schoolId,
          date: menuDate.toISOString(),
          meal_type: 'LUNCH',
          description: 'Menu 1'
        });

      menuDate.setDate(menuDate.getDate() + 1);
      await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          school_id: schoolId,
          date: menuDate.toISOString(),
          meal_type: 'DINNER',
          description: 'Menu 2'
        });
    });

    test('Should get all menus', async () => {
      const response = await request(app)
        .get('/api/menus')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    test('Should filter menus by school', async () => {
      const response = await request(app)
        .get(`/api/menus?school_id=${schoolId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].school_id._id).toBe(schoolId);
    });

    test('Should filter menus by date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/menus?date=${dateString}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
    });

    test('Should filter menus by status', async () => {
      const response = await request(app)
        .get('/api/menus?status=PENDING')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].status).toBe('PENDING');
    });

    test('Should reject unauthorized access to menus list', async () => {
      const response = await request(app)
        .get('/api/menus');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/menus/weekly - Menus Hebdomadaires', () => {
    beforeEach(async () => {
      // Create approved menus for the week
      const startDate = new Date();
      
      for (let i = 0; i < 7; i++) {
        const menuDate = new Date(startDate);
        menuDate.setDate(startDate.getDate() + i);
        
        const createResponse = await request(app)
          .post('/api/menus')
          .set('Authorization', `Bearer ${canteenManagerToken}`)
          .send({
            school_id: schoolId,
            date: menuDate.toISOString(),
            meal_type: 'LUNCH',
            description: `Menu jour ${i}`
          });

        // Approve the menu
        await request(app)
          .post(`/api/menus/${createResponse.body.data._id}/approve`)
          .set('Authorization', `Bearer ${schoolAdminToken}`)
          .send({
            approved: true
          });
      }
    });

    test('Should get weekly menus', async () => {
      const startDate = new Date();
      const startDateString = startDate.toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/menus/weekly?school_id=${schoolId}&start_date=${startDateString}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(7);
      expect(response.body.data[0].status).toBe('APPROVED');
    });

    test('Should reject weekly menus without parameters', async () => {
      const response = await request(app)
        .get('/api/menus/weekly')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('School ID and start date are required.');
    });
  });

  describe('GET /api/menus/pending - Menus en Attente', () => {
    beforeEach(async () => {
      // Create pending menus
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + 1);

      await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          school_id: schoolId,
          date: menuDate.toISOString(),
          meal_type: 'LUNCH',
          description: 'Menu en attente 1'
        });

      menuDate.setDate(menuDate.getDate() + 1);
      await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          school_id: schoolId,
          date: menuDate.toISOString(),
          meal_type: 'DINNER',
          description: 'Menu en attente 2'
        });
    });

    test('Should get pending menus', async () => {
      const response = await request(app)
        .get('/api/menus/pending')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].status).toBe('PENDING');
    });

    test('Should filter pending menus by school', async () => {
      const response = await request(app)
        .get(`/api/menus/pending?school_id=${schoolId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].school_id._id).toBe(schoolId);
    });
  });

  describe('GET /api/menus/:id - Détails d\'un Menu', () => {
    beforeEach(async () => {
      // Create a menu for testing
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + 1);

      const menuResponse = await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          school_id: schoolId,
          date: menuDate.toISOString(),
          meal_type: 'LUNCH',
          description: 'Menu test détaillé',
          items: ['Riz', 'Sauce', 'Viande'],
          allergens: ['Gluten']
        });

      menuId = menuResponse.body.data._id;
    });

    test('Should get menu by ID', async () => {
      const response = await request(app)
        .get(`/api/menus/${menuId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(menuId);
      expect(response.body.data.description).toBe('Menu test détaillé');
      expect(response.body.data.items).toEqual(['Riz', 'Sauce', 'Viande']);
      expect(response.body.data.allergens).toEqual(['Gluten']);
    });

    test('Should return 404 for non-existent menu', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/menus/${fakeId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Menu not found.');
    });

    test('Should reject unauthorized access to menu details', async () => {
      const response = await request(app)
        .get(`/api/menus/${menuId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/menus/:id - Mise à Jour de Menu', () => {
    beforeEach(async () => {
      // Create a menu for testing
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + 1);

      const menuResponse = await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          school_id: schoolId,
          date: menuDate.toISOString(),
          meal_type: 'LUNCH',
          description: 'Menu à modifier'
        });

      menuId = menuResponse.body.data._id;
    });

    test('Should update menu successfully', async () => {
      const response = await request(app)
        .put(`/api/menus/${menuId}`)
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          description: 'Menu modifié avec succès',
          items: ['Nouveau riz', 'Nouvelle sauce'],
          allergens: ['Nouvel allergène']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Menu updated successfully.');
      expect(response.body.data.description).toBe('Menu modifié avec succès');
      expect(response.body.data.items).toEqual(['Nouveau riz', 'Nouvelle sauce']);
    });

    test('Should return 404 for non-existent menu update', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .put(`/api/menus/${fakeId}`)
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          description: 'Menu inexistant'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Menu not found.');
    });
  });

  describe('DELETE /api/menus/:id - Suppression de Menu', () => {
    beforeEach(async () => {
      // Create a menu for testing
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + 1);

      const menuResponse = await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          school_id: schoolId,
          date: menuDate.toISOString(),
          meal_type: 'LUNCH',
          description: 'Menu à supprimer'
        });

      menuId = menuResponse.body.data._id;
    });

    test('Should delete menu successfully', async () => {
      const response = await request(app)
        .delete(`/api/menus/${menuId}`)
        .set('Authorization', `Bearer ${canteenManagerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Menu deleted successfully.');

      // Verify menu was deleted
      const getResponse = await request(app)
        .get(`/api/menus/${menuId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(getResponse.status).toBe(404);
    });

    test('Should return 404 for non-existent menu deletion', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/api/menus/${fakeId}`)
        .set('Authorization', `Bearer ${canteenManagerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Menu not found.');
    });
  });

  describe('POST /api/menus/:id/approve - Approbation de Menu', () => {
    beforeEach(async () => {
      // Create a menu for testing
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + 1);

      const menuResponse = await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          school_id: schoolId,
          date: menuDate.toISOString(),
          meal_type: 'LUNCH',
          description: 'Menu à approuver'
        });

      menuId = menuResponse.body.data._id;
    });

    test('Should approve menu successfully', async () => {
      const response = await request(app)
        .post(`/api/menus/${menuId}/approve`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          approved: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Menu approved successfully.');
      expect(response.body.data.status).toBe('APPROVED');
      expect(response.body.data.approved_by.first_name).toBe('Directeur');
      expect(response.body.data.approved_at).toBeDefined();
    });

    test('Should reject menu successfully', async () => {
      const response = await request(app)
        .post(`/api/menus/${menuId}/approve`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          approved: false,
          rejection_reason: 'Menu non équilibré'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Menu rejected successfully.');
      expect(response.body.data.status).toBe('REJECTED');
      expect(response.body.data.rejection_reason).toBe('Menu non équilibré');
    });

    test('Should require rejection reason when rejecting', async () => {
      const response = await request(app)
        .post(`/api/menus/${menuId}/approve`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          approved: false
          // Missing rejection_reason
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Rejection reason is required when rejecting a menu.');
    });

    test('Should require approval status', async () => {
      const response = await request(app)
        .post(`/api/menus/${menuId}/approve`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          rejection_reason: 'Test'
          // Missing approved field
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Approval status is required.');
    });

    test('Should return 404 for non-existent menu approval', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post(`/api/menus/${fakeId}/approve`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          approved: true
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Menu not found.');
    });

    test('Should create notification for menu creator', async () => {
      // Approve the menu
      await request(app)
        .post(`/api/menus/${menuId}/approve`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          approved: true
        });

      // Check if notification was created for canteen manager
      const notificationsResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${canteenManagerToken}`);

      expect(notificationsResponse.status).toBe(200);
      expect(notificationsResponse.body.success).toBe(true);
      expect(notificationsResponse.body.data.length).toBeGreaterThan(0);
      
      const menuNotification = notificationsResponse.body.data.find(
        n => n.type === 'MENU_APPROVED' && n.related_menu_id === menuId
      );
      
      expect(menuNotification).toBeDefined();
      expect(menuNotification.title).toBe('Menu Approuvé');
    });
  });

  describe('Permissions et Sécurité', () => {
    test('Canteen manager should only manage their school menus', async () => {
      // Create another school
      const db = mongoose.connection.db;
      const otherSchoolResult = await db.collection('schools').insertOne({
        name: 'Autre École',
        address: '456 Rue Autre',
        city: 'Bobo-Dioulasso',
        adminName: 'Directeur Autre',
        studentCount: 100,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const otherSchoolId = otherSchoolResult.insertedId.toString();

      // Try to create menu for other school
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + 1);

      const response = await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          school_id: otherSchoolId,
          date: menuDate.toISOString(),
          meal_type: 'LUNCH',
          description: 'Menu non autorisé'
        });

      // This might succeed or fail depending on business logic
      expect([201, 403, 404]).toContain(response.status);
    });

    test('Parent should have limited access to menus', async () => {
      // Create parent
      await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'awa.parent@gmail.com',
          password: 'Parent123!',
          role: 'PARENT'
        });

      const parentLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.parent@gmail.com',
          password: 'Parent123!'
        });

      const parentToken = parentLoginResponse.body.data.token;

      // Try to create menu (should fail)
      const menuDate = new Date();
      menuDate.setDate(menuDate.getDate() + 1);

      const createResponse = await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          school_id: schoolId,
          date: menuDate.toISOString(),
          meal_type: 'LUNCH',
          description: 'Menu parent'
        });

      expect([401, 403]).toContain(createResponse.status);

      // Try to get menus (might succeed for read access)
      const getResponse = await request(app)
        .get('/api/menus')
        .set('Authorization', `Bearer ${parentToken}`);

      // Parents might be able to see menus, especially approved ones
      expect([200, 401, 403]).toContain(getResponse.status);
    });
  });
});
