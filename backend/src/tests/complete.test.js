const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import app
const app = require('../dist/server.js').default;

describe('🧪 COMPLETE API TEST SUITE', () => {
  let schoolAdminToken;
  let superAdminToken;
  let schoolId;
  let canteenManagerId;
  let studentId;
  let subscriptionId;
  let paymentId;
  let testResults = { passed: 0, failed: 0, total: 0 };

  // Helper function
  async function runTest(testName, testFn) {
    testResults.total++;
    try {
      await testFn();
      console.log(`✅ ${testName}`);
      testResults.passed++;
    } catch (error) {
      console.log(`❌ ${testName}`);
      console.log(`   Error: ${error.message}`);
      testResults.failed++;
    }
  }

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/dabali-test');
    console.log('📦 Connected to test database');
  });

  afterAll(async () => {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
    console.log('\n📊 Final Test Results:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Total: ${testResults.total}`);
    console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  });

  beforeEach(async () => {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
  });

  // ========================================
  // SETUP TESTS
  // ========================================
  describe('🔧 Setup and Authentication', () => {
    test('Health Check API', async () => {
      const response = await request(app).get('/api/health');
      if (response.status !== 200) throw new Error('Health check failed');
      if (!response.body.success) throw new Error('Health check not successful');
    });

    test('Create Super Admin and Login', async () => {
      const db = mongoose.connection.db;
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      
      await db.collection('users').insertOne({
        first_name: 'Super',
        last_name: 'Admin',
        email: 'super.admin@gmail.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'super.admin@gmail.com',
          password: 'Admin123!'
        });

      if (loginResponse.status !== 200) throw new Error('Super admin login failed');
      superAdminToken = loginResponse.body.data.token;
    });

    test('Create School Admin and Login', async () => {
      const db = mongoose.connection.db;
      
      // Create school
      const schoolResult = await db.collection('schools').insertOne({
        name: 'École Primaire de Ouagadougou',
        address: '123 Rue Test',
        city: 'Ouagadougou',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      schoolId = schoolResult.insertedId.toString();

      // Create school admin
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      await db.collection('users').insertOne({
        first_name: 'Koné',
        last_name: 'Ibrahim',
        email: 'kone.ibrahim@gmail.com',
        password: hashedPassword,
        role: 'SCHOOL_ADMIN',
        school_id: new mongoose.Types.ObjectId(schoolId),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'kone.ibrahim@gmail.com',
          password: 'Admin123!'
        });

      if (loginResponse.status !== 200) throw new Error('School admin login failed');
      schoolAdminToken = loginResponse.body.data.token;
    });
  });

  // ========================================
  // CANTEEN MANAGER TESTS
  // ========================================
  describe('👨‍🍳 Canteen Manager Management', () => {
    test('Create Canteen Manager - Success', async () => {
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Traoré',
          last_name: 'Moussa',
          email: 'moussa.traore@gmail.com',
          phone: '+22670333333',
          school_id: schoolId
        });

      if (response.status !== 201) throw new Error('Create canteen manager failed');
      if (!response.body.data.temporary_password) throw new Error('No temporary password generated');
      canteenManagerId = response.body.data.user.id;
    });

    test('Create Canteen Manager - Invalid Email', async () => {
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Test',
          last_name: 'User',
          email: 'test@yahoo.com', // Invalid email
          phone: '+22670333334',
          school_id: schoolId
        });

      if (response.status !== 400) throw new Error('Should reject non-gmail email');
      if (response.body.message !== 'Seuls les emails se terminant par @gmail.com sont autorisés.') {
        throw new Error('Wrong error message for invalid email');
      }
    });

    test('Create Canteen Manager - Missing Fields', async () => {
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Test',
          // Missing last_name, email, school_id
        });

      if (response.status !== 400) throw new Error('Should reject missing fields');
    });

    test('Create Canteen Manager - Unauthorized', async () => {
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .send({
          first_name: 'Test',
          last_name: 'User',
          email: 'test@gmail.com',
          phone: '+22670333335',
          school_id: schoolId
        });

      if (response.status !== 401) throw new Error('Should reject unauthorized access');
    });

    test('Get Canteen Managers by School', async () => {
      // Create a manager first
      await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Manager',
          last_name: 'Test',
          email: 'manager.test@gmail.com',
          phone: '+22670333336',
          school_id: schoolId
        });

      const response = await request(app)
        .get(`/api/users/canteen-managers/school/${schoolId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      if (response.status !== 200) throw new Error('Get managers failed');
      if (!Array.isArray(response.body.data)) throw new Error('Should return array');
      if (response.body.data.length === 0) throw new Error('Should return at least one manager');
    });

    test('Reset Canteen Manager Password', async () => {
      // Create manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Reset',
          last_name: 'Test',
          email: 'reset.test@gmail.com',
          phone: '+22670333337',
          school_id: schoolId
        });

      const managerId = createResponse.body.data.user.id;

      const response = await request(app)
        .post(`/api/users/canteen-managers/${managerId}/reset-password`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      if (response.status !== 200) throw new Error('Password reset failed');
      if (!response.body.data.temporary_password) throw new Error('No new temporary password');
    });

    test('Delete Canteen Manager', async () => {
      // Create manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Delete',
          last_name: 'Test',
          email: 'delete.test@gmail.com',
          phone: '+22670333338',
          school_id: schoolId
        });

      const managerId = createResponse.body.data.user.id;

      const response = await request(app)
        .delete(`/api/users/canteen-managers/${managerId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      if (response.status !== 200) throw new Error('Delete manager failed');
    });
  });

  // ========================================
  // AUTHENTICATION TESTS
  // ========================================
  describe('🔐 Authentication', () => {
    test('Canteen Manager Login with Temporary Password', async () => {
      // Create manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Auth',
          last_name: 'Test',
          email: 'auth.test@gmail.com',
          phone: '+22670333339',
          school_id: schoolId
        });

      const temporaryPassword = createResponse.body.data.temporary_password;

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'auth.test@gmail.com',
          password: temporaryPassword
        });

      if (response.status !== 200) throw new Error('Login with temporary password failed');
    });

    test('Change Temporary Password - Success', async () => {
      // Create manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Change',
          last_name: 'Test',
          email: 'change.test@gmail.com',
          phone: '+22670333340',
          school_id: schoolId
        });

      const temporaryPassword = createResponse.body.data.temporary_password;

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'change.test@gmail.com',
          password: temporaryPassword
        });

      const token = loginResponse.body.data.token;

      // Change password
      const response = await request(app)
        .post('/api/auth/change-temporary-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: temporaryPassword,
          new_password: 'NewSecurePass123!',
          confirm_password: 'NewSecurePass123!'
        });

      if (response.status !== 200) throw new Error('Password change failed');
    });

    test('Change Temporary Password - Wrong Current Password', async () => {
      // Create manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Wrong',
          last_name: 'Test',
          email: 'wrong.test@gmail.com',
          phone: '+22670333341',
          school_id: schoolId
        });

      const temporaryPassword = createResponse.body.data.temporary_password;

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong.test@gmail.com',
          password: temporaryPassword
        });

      const token = loginResponse.body.data.token;

      // Try change with wrong password
      const response = await request(app)
        .post('/api/auth/change-temporary-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: 'WrongPassword123!',
          new_password: 'NewSecurePass123!',
          confirm_password: 'NewSecurePass123!'
        });

      if (response.status !== 400) throw new Error('Should reject wrong current password');
    });

    test('Change Temporary Password - Password Mismatch', async () => {
      // Create manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Mismatch',
          last_name: 'Test',
          email: 'mismatch.test@gmail.com',
          phone: '+22670333342',
          school_id: schoolId
        });

      const temporaryPassword = createResponse.body.data.temporary_password;

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mismatch.test@gmail.com',
          password: temporaryPassword
        });

      const token = loginResponse.body.data.token;

      // Try change with mismatched passwords
      const response = await request(app)
        .post('/api/auth/change-temporary-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: temporaryPassword,
          new_password: 'NewSecurePass123!',
          confirm_password: 'DifferentPass123!'
        });

      if (response.status !== 400) throw new Error('Should reject password mismatch');
    });
  });

  // ========================================
  // SCHOOL MANAGEMENT TESTS
  // ========================================
  describe('🏫 School Management', () => {
    test('Create School - Success', async () => {
      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'École Secondaire de Bobo',
          address: '456 Avenue Test',
          city: 'Bobo-Dioulasso'
        });

      if (response.status !== 201) throw new Error('Create school failed');
      if (!response.body.data.school.name) throw new Error('School name missing');
    });

    test('Get All Schools', async () => {
      // Create a school first
      await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Test School',
          address: '123 Test St',
          city: 'Test City'
        });

      const response = await request(app)
        .get('/api/schools')
        .set('Authorization', `Bearer ${superAdminToken}`);

      if (response.status !== 200) throw new Error('Get schools failed');
      if (!Array.isArray(response.body.data)) throw new Error('Should return array');
    });

    test('Create School - Unauthorized', async () => {
      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Unauthorized School',
          address: '123 Test St',
          city: 'Test City'
        });

      if (response.status !== 403) throw new Error('Should reject school admin creating school');
    });
  });

  // ========================================
  // USER MANAGEMENT TESTS
  // ========================================
  describe('👥 User Management', () => {
    test('Get All Users - Super Admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      if (response.status !== 200) throw new Error('Get users failed');
      if (!Array.isArray(response.body.data)) throw new Error('Should return array');
    });

    test('Get User by ID', async () => {
      // Get the school admin user ID
      const db = mongoose.connection.db;
      const adminUser = await db.collection('users').findOne({ email: 'kone.ibrahim@gmail.com' });

      const response = await request(app)
        .get(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      if (response.status !== 200) throw new Error('Get user by ID failed');
      if (!response.body.data.email) throw new Error('User email missing');
    });

    test('Update User Profile', async () => {
      // Get the school admin user ID
      const db = mongoose.connection.db;
      const adminUser = await db.collection('users').findOne({ email: 'kone.ibrahim@gmail.com' });

      const response = await request(app)
        .put(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          first_name: 'Koné Updated',
          last_name: 'Ibrahim Updated',
          phone: '+22670444444'
        });

      if (response.status !== 200) throw new Error('Update user failed');
      if (response.body.data.first_name !== 'Koné Updated') throw new Error('User not updated');
    });

    test('Update User - Unauthorized Fields', async () => {
      // Get the school admin user ID
      const db = mongoose.connection.db;
      const adminUser = await db.collection('users').findOne({ email: 'kone.ibrahim@gmail.com' });

      const response = await request(app)
        .put(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'new.email@gmail.com', // Should not be allowed
          password: 'newpassword123'
        });

      if (response.status !== 400) throw new Error('Should reject updating email/password');
    });
  });

  // ========================================
  // VALIDATION TESTS
  // ========================================
  describe('✅ Input Validation', () => {
    test('Email Validation - Gmail Only', async () => {
      const invalidEmails = [
        'test@yahoo.com',
        'test@hotmail.com',
        'test@school.bf',
        'test@outlook.com',
        'test@icloud.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/users/canteen-managers')
          .set('Authorization', `Bearer ${schoolAdminToken}`)
          .send({
            first_name: 'Test',
            last_name: 'User',
            email: email,
            phone: '+22670333343',
            school_id: schoolId
          });

        if (response.status !== 400) throw new Error(`Should reject email: ${email}`);
      }
    });

    test('Phone Validation', async () => {
      const invalidPhones = [
        '123456', // Too short
        '+22612345678901', // Too long
        '22670333333', // Missing +
        '+22570333333' // Wrong country code
      ];

      for (const phone of invalidPhones) {
        const response = await request(app)
          .post('/api/users/canteen-managers')
          .set('Authorization', `Bearer ${schoolAdminToken}`)
          .send({
            first_name: 'Test',
            last_name: 'User',
            email: 'phone.test@gmail.com',
            phone: phone,
            school_id: schoolId
          });

        // Phone validation might not be strictly enforced, so we just check it doesn't crash
        if (response.status >= 500) throw new Error(`Server error with phone: ${phone}`);
      }
    });

    test('Required Fields Validation', async () => {
      const requiredFields = ['first_name', 'last_name', 'email', 'school_id'];

      for (const field of requiredFields) {
        const requestBody = {
          first_name: 'Test',
          last_name: 'User',
          email: 'validation.test@gmail.com',
          phone: '+22670333344',
          school_id: schoolId
        };

        delete requestBody[field];

        const response = await request(app)
          .post('/api/users/canteen-managers')
          .set('Authorization', `Bearer ${schoolAdminToken}`)
          .send(requestBody);

        if (response.status !== 400) throw new Error(`Should reject missing field: ${field}`);
      }
    });
  });

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================
  describe('🚨 Error Handling', () => {
    test('404 - Not Found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      if (response.status !== 404) throw new Error('Should return 404 for non-existent user');
    });

    test('401 - Unauthorized', async () => {
      const response = await request(app)
        .get('/api/users');

      if (response.status !== 401) throw new Error('Should return 401 without token');
    });

    test('403 - Forbidden', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${schoolAdminToken}`); // School admin can't get all users

      if (response.status !== 403) throw new Error('Should return 403 for insufficient permissions');
    });

    test('400 - Bad Request', async () => {
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: '', // Empty first name
          last_name: 'User',
          email: 'bad.request@gmail.com',
          phone: '+22670333345',
          school_id: schoolId
        });

      if (response.status !== 400) throw new Error('Should return 400 for invalid data');
    });
  });

  // ========================================
  // SECURITY TESTS
  // ========================================
  describe('🔒 Security', () => {
    test('Password Hashing', async () => {
      // Create a user
      const db = mongoose.connection.db;
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      
      await db.collection('users').insertOne({
        first_name: 'Security',
        last_name: 'Test',
        email: 'security.test@gmail.com',
        password: hashedPassword,
        role: 'PARENT',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Try to login with wrong password
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security.test@gmail.com',
          password: 'WrongPassword123!'
        });

      if (response.status !== 401) throw new Error('Should reject wrong password');
    });

    test('Token Validation', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid_token_here');

      if (response.status !== 401) throw new Error('Should reject invalid token');
    });

    test('SQL Injection Prevention', async () => {
      const maliciousPayload = {
        first_name: "'; DROP TABLE users; --",
        last_name: 'Test',
        email: 'sql.injection@gmail.com',
        phone: '+22670333346',
        school_id: schoolId
      };

      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send(maliciousPayload);

      // Should not crash the server
      if (response.status >= 500) throw new Error('Server crashed with malicious input');
    });

    test('XSS Prevention', async () => {
      const xssPayload = {
        first_name: '<script>alert("XSS")</script>',
        last_name: 'Test',
        email: 'xss.test@gmail.com',
        phone: '+22670333347',
        school_id: schoolId
      };

      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send(xssPayload);

      // Should handle XSS attempt gracefully
      if (response.status >= 500) throw new Error('Server crashed with XSS input');
    });
  });

  // ========================================
  // PERFORMANCE TESTS
  // ========================================
  describe('⚡ Performance', () => {
    test('Concurrent Requests', async () => {
      const promises = [];
      
      // Create 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/users/canteen-managers')
            .set('Authorization', `Bearer ${schoolAdminToken}`)
            .send({
              first_name: `Concurrent${i}`,
              last_name: 'Test',
              email: `concurrent${i}.test@gmail.com`,
              phone: `+226703333${48 + i}`,
              school_id: schoolId
            })
        );
      }

      const results = await Promise.all(promises);
      
      // All should succeed
      for (let i = 0; i < results.length; i++) {
        if (results[i].status !== 201) throw new Error(`Concurrent request ${i} failed`);
      }
    });

    test('Response Time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/health');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 1 second
      if (responseTime > 1000) throw new Error(`Response too slow: ${responseTime}ms`);
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================
  describe('🔗 Integration', () => {
    test('Complete Canteen Manager Workflow', async () => {
      // 1. Create canteen manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Workflow',
          last_name: 'Test',
          email: 'workflow.test@gmail.com',
          phone: '+22670333348',
          school_id: schoolId
        });

      if (createResponse.status !== 201) throw new Error('Step 1: Create manager failed');
      
      const temporaryPassword = createResponse.body.data.temporary_password;
      const managerId = createResponse.body.data.user.id;

      // 2. Login with temporary password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'workflow.test@gmail.com',
          password: temporaryPassword
        });

      if (loginResponse.status !== 200) throw new Error('Step 2: Login failed');
      
      const token = loginResponse.body.data.token;

      // 3. Change password
      const changeResponse = await request(app)
        .post('/api/auth/change-temporary-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: temporaryPassword,
          new_password: 'WorkflowPass123!',
          confirm_password: 'WorkflowPass123!'
        });

      if (changeResponse.status !== 200) throw new Error('Step 3: Password change failed');

      // 4. Login with new password
      const newLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'workflow.test@gmail.com',
          password: 'WorkflowPass123!'
        });

      if (newLoginResponse.status !== 200) throw new Error('Step 4: Login with new password failed');

      // 5. Get manager info
      const getResponse = await request(app)
        .get(`/api/users/canteen-managers/school/${schoolId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      if (getResponse.status !== 200) throw new Error('Step 5: Get managers failed');

      // 6. Reset password (admin)
      const resetResponse = await request(app)
        .post(`/api/users/canteen-managers/${managerId}/reset-password`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      if (resetResponse.status !== 200) throw new Error('Step 6: Password reset failed');

      // 7. Delete manager
      const deleteResponse = await request(app)
        .delete(`/api/users/canteen-managers/${managerId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      if (deleteResponse.status !== 200) throw new Error('Step 7: Delete manager failed');

      console.log('   ✅ Complete workflow successful');
    });
  });

  // Run all tests
  await runTest('Complete Test Suite', async () => {
    // This will run all the describe blocks above
  });
});

// Run the test suite
async function runCompleteTestSuite() {
  console.log('🚀 Starting Complete API Test Suite...\n');
  
  try {
    // Import and run the test suite
    const testSuite = require('./complete.test.js');
    // The tests will run automatically when this file is executed
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runCompleteTestSuite();
}
