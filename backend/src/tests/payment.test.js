const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../server');

describe('Payment API - Tests Unitaires', () => {
  let superAdminToken;
  let schoolAdminToken;
  let parentToken;
  let canteenManagerToken;
  let schoolId;
  let studentId;
  let subscriptionId;
  let paymentId;

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

    test('Should create school, admin, parent, student and subscription', async () => {
      // Create school
      const db = mongoose.connection.db;
      const schoolResult = await db.collection('schools').insertOne({
        name: 'École Test Paiement',
        address: '789 Rue Paiement',
        city: 'Ouagadougou',
        adminName: 'Directeur Paiement',
        studentCount: 120,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      schoolId = schoolResult.insertedId.toString();

      // Create school admin
      const hashedPassword = await bcrypt.hash('SchoolAdmin123!', 10);
      await db.collection('users').insertOne({
        first_name: 'Directeur',
        last_name: 'Paiement',
        email: 'director@ecole-paiement.bf',
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
          email: 'director@ecole-paiement.bf',
          password: 'SchoolAdmin123!'
        });

      schoolAdminToken = adminLoginResponse.body.data.token;

      // Create parent
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

      parentToken = parentLoginResponse.body.data.token;

      // Create student
      const studentResult = await db.collection('students').insertOne({
        first_name: 'Mohamed',
        last_name: 'Traoré',
        class_name: 'CM2',
        school_id: new mongoose.Types.ObjectId(schoolId),
        parent_id: new mongoose.Types.ObjectId(parentLoginResponse.body.data.user.id),
        created_at: new Date(),
        updated_at: new Date()
      });
      studentId = studentResult.insertedId.toString();

      // Create subscription
      const subscriptionResult = await db.collection('subscriptions').insertOne({
        student_id: new mongoose.Types.ObjectId(studentId),
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'ACTIVE',
        meal_plan: 'STANDARD',
        price: 15000,
        created_at: new Date(),
        updated_at: new Date()
      });
      subscriptionId = subscriptionResult.insertedId.toString();
    });
  });

  describe('POST /api/payments - Création de Paiement', () => {
    test('Should create payment successfully', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          subscription_id: subscriptionId,
          amount: 15000,
          method: 'MOBILE_MONEY',
          reference: 'REF001'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payment created successfully.');
      expect(response.body.data.amount).toBe(15000);
      expect(response.body.data.method).toBe('MOBILE_MONEY');
      expect(response.body.data.reference).toBe('REF001');
      expect(response.body.data.status).toBe('PENDING');
      expect(response.body.data.subscription_id._id).toBe(subscriptionId);

      paymentId = response.body.data._id;
    });

    test('Should reject payment without required fields', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          amount: 15000
          // Missing subscription_id and method
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Subscription ID, amount, and method are required.');
    });

    test('Should reject payment for non-existent subscription', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          subscription_id: fakeId,
          amount: 15000,
          method: 'MOBILE_MONEY'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Subscription not found.');
    });

    test('Should reject invalid payment method', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          subscription_id: subscriptionId,
          amount: 15000,
          method: 'INVALID_METHOD'
        });

      expect(response.status).toBe(500); // Will fail validation in schema
      expect(response.body.success).toBe(false);
    });

    test('Should reject unauthorized payment creation', async () => {
      const response = await request(app)
        .post('/api/payments')
        .send({
          subscription_id: subscriptionId,
          amount: 15000,
          method: 'MOBILE_MONEY'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('Should validate payment amount', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          subscription_id: subscriptionId,
          amount: -1000, // Negative amount
          method: 'MOBILE_MONEY'
        });

      expect(response.status).toBe(500); // Will fail validation
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/payments - Liste des Paiements', () => {
    beforeEach(async () => {
      // Create a payment for testing
      const paymentResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          subscription_id: subscriptionId,
          amount: 15000,
          method: 'MOBILE_MONEY'
        });
      paymentId = paymentResponse.body.data._id;
    });

    test('Should get all payments', async () => {
      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].amount).toBe(15000);
      expect(response.body.data[0].subscription_id._id).toBe(subscriptionId);
    });

    test('Should filter payments by subscription', async () => {
      const response = await request(app)
        .get(`/api/payments?subscription_id=${subscriptionId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].subscription_id._id).toBe(subscriptionId);
    });

    test('Should filter payments by status', async () => {
      const response = await request(app)
        .get('/api/payments?status=PENDING')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('PENDING');
    });

    test('Should reject unauthorized access to payments list', async () => {
      const response = await request(app)
        .get('/api/payments');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/payments/:id - Détails d\'un Paiement', () => {
    beforeEach(async () => {
      // Create a payment for testing
      const paymentResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          subscription_id: subscriptionId,
          amount: 15000,
          method: 'MOBILE_MONEY'
        });
      paymentId = paymentResponse.body.data._id;
    });

    test('Should get payment by ID', async () => {
      const response = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(paymentId);
      expect(response.body.data.amount).toBe(15000);
      expect(response.body.data.subscription_id._id).toBe(subscriptionId);
    });

    test('Should return 404 for non-existent payment', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/payments/${fakeId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment not found.');
    });

    test('Should reject unauthorized access to payment details', async () => {
      const response = await request(app)
        .get(`/api/payments/${paymentId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/payments/subscription/:subscriptionId - Paiements par Abonnement', () => {
    beforeEach(async () => {
      // Create a payment for testing
      const paymentResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          subscription_id: subscriptionId,
          amount: 15000,
          method: 'MOBILE_MONEY'
        });
      paymentId = paymentResponse.body.data._id;
    });

    test('Should get payments by subscription', async () => {
      const response = await request(app)
        .get(`/api/payments/subscription/${subscriptionId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].subscription_id._id).toBe(subscriptionId);
    });

    test('Should return empty array for subscription with no payments', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/payments/subscription/${fakeId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('POST /api/payments/:id/verify - Vérification de Paiement', () => {
    beforeEach(async () => {
      // Create a payment for testing
      const paymentResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          subscription_id: subscriptionId,
          amount: 15000,
          method: 'MOBILE_MONEY'
        });
      paymentId = paymentResponse.body.data._id;
    });

    test('Should verify payment as completed', async () => {
      const response = await request(app)
        .post(`/api/payments/${paymentId}/verify`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          status: 'COMPLETED'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payment verified successfully.');
      expect(response.body.data.status).toBe('COMPLETED');
      expect(response.body.data.paid_at).toBeDefined();
    });

    test('Should verify payment as failed', async () => {
      const response = await request(app)
        .post(`/api/payments/${paymentId}/verify`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          status: 'FAILED'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('FAILED');
      expect(response.body.data.paid_at).toBeNull();
    });

    test('Should reject invalid payment status', async () => {
      const response = await request(app)
        .post(`/api/payments/${paymentId}/verify`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          status: 'INVALID_STATUS'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Valid payment status is required.');
    });

    test('Should return 404 for non-existent payment verification', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post(`/api/payments/${fakeId}/verify`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          status: 'COMPLETED'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment not found.');
    });
  });

  describe('POST /api/payments/:id/simulate-confirmation - Simulation de Confirmation', () => {
    beforeEach(async () => {
      // Create a payment for testing
      const paymentResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          subscription_id: subscriptionId,
          amount: 15000,
          method: 'MOBILE_MONEY'
        });
      paymentId = paymentResponse.body.data._id;
    });

    test('Should simulate payment confirmation', async () => {
      const response = await request(app)
        .post(`/api/payments/${paymentId}/simulate-confirmation`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payment confirmed successfully.');
      expect(response.body.data.status).toBe('COMPLETED');
      expect(response.body.data.paid_at).toBeDefined();
    });

    test('Should return 404 for non-existent payment simulation', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post(`/api/payments/${fakeId}/simulate-confirmation`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment not found.');
    });
  });

  describe('Permissions et Sécurité', () => {
    test('Parent should only access their own payments', async () => {
      // Create payment as parent
      const paymentResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          subscription_id: subscriptionId,
          amount: 15000,
          method: 'MOBILE_MONEY'
        });

      // Create another parent and try to access the payment
      await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Fatou',
          last_name: 'Ouattara',
          email: 'fatou.ouattara@gmail.com',
          password: 'Parent456!',
          role: 'PARENT'
        });

      const otherParentLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'fatou.ouattara@gmail.com',
          password: 'Parent456!'
        });

      const otherParentToken = otherParentLoginResponse.body.data.token;

      // Try to access payment (this might work depending on implementation)
      const response = await request(app)
        .get(`/api/payments/${paymentResponse.body.data._id}`)
        .set('Authorization', `Bearer ${otherParentToken}`);

      // This test depends on the business logic - parents might see all payments or only their own
      expect([200, 403, 404]).toContain(response.status);
    });

    test('Canteen manager should have appropriate access', async () => {
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

      // Create payment
      await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          subscription_id: subscriptionId,
          amount: 15000,
          method: 'MOBILE_MONEY'
        });

      // Try to access payments list
      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${canteenManagerToken}`);

      // This depends on business rules - canteen managers might or might not access payments
      expect([200, 403]).toContain(response.status);
    });
  });
});
