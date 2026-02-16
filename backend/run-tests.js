const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import app
const app = require('./dist/server.js').default;

async function runTests() {
  console.log('🚀 Starting Complete API Test Suite...\n');
  
  let schoolAdminToken;
  let superAdminToken;
  let schoolId;
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

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/dabali-test');
    console.log('📦 Connected to test database');

    // Clean up
    await mongoose.connection.db.dropDatabase();
    console.log('🧹 Database cleaned');

    // ========================================
    // SETUP TESTS
    // ========================================
    await runTest('Health Check API', async () => {
      const response = await request(app).get('/api/health');
      if (response.status !== 200) throw new Error('Health check failed');
      if (!response.body.success) throw new Error('Health check not successful');
    });

    await runTest('Create Super Admin and Login', async () => {
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

    await runTest('Create School Admin and Login', async () => {
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

    // ========================================
    // CANTEEN MANAGER TESTS
    // ========================================
    await runTest('Create Canteen Manager - Success', async () => {
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
    });

    await runTest('Create Canteen Manager - Invalid Email (@yahoo.com)', async () => {
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

    await runTest('Create Canteen Manager - Invalid Email (@school.bf)', async () => {
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Test',
          last_name: 'User',
          email: 'test@school.bf', // Invalid email
          phone: '+22670333335',
          school_id: schoolId
        });

      if (response.status !== 400) throw new Error('Should reject school.bf email');
    });

    await runTest('Create Canteen Manager - Missing Fields', async () => {
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Test',
          // Missing last_name, email, school_id
        });

      if (response.status !== 400) throw new Error('Should reject missing fields');
    });

    await runTest('Create Canteen Manager - Unauthorized', async () => {
      const response = await request(app)
        .post('/api/users/canteen-managers')
        .send({
          first_name: 'Test',
          last_name: 'User',
          email: 'test@gmail.com',
          phone: '+22670333336',
          school_id: schoolId
        });

      if (response.status !== 401) throw new Error('Should reject unauthorized access');
    });

    await runTest('Get Canteen Managers by School', async () => {
      // Create a manager first
      await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Manager',
          last_name: 'Test',
          email: 'manager.test@gmail.com',
          phone: '+22670333337',
          school_id: schoolId
        });

      const response = await request(app)
        .get(`/api/users/canteen-managers/school/${schoolId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      if (response.status !== 200) throw new Error('Get managers failed');
      if (!Array.isArray(response.body.data)) throw new Error('Should return array');
      if (response.body.data.length === 0) throw new Error('Should return at least one manager');
    });

    await runTest('Reset Canteen Manager Password', async () => {
      // Create manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Reset',
          last_name: 'Test',
          email: 'reset.test@gmail.com',
          phone: '+22670333338',
          school_id: schoolId
        });

      const managerId = createResponse.body.data.user.id;

      const response = await request(app)
        .post(`/api/users/canteen-managers/${managerId}/reset-password`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      if (response.status !== 200) throw new Error('Password reset failed');
      if (!response.body.data.temporary_password) throw new Error('No new temporary password');
    });

    await runTest('Delete Canteen Manager', async () => {
      // Create manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Delete',
          last_name: 'Test',
          email: 'delete.test@gmail.com',
          phone: '+22670333339',
          school_id: schoolId
        });

      const managerId = createResponse.body.data.user.id;

      const response = await request(app)
        .delete(`/api/users/canteen-managers/${managerId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      if (response.status !== 200) throw new Error('Delete manager failed');
    });

    // ========================================
    // AUTHENTICATION TESTS
    // ========================================
    await runTest('Canteen Manager Login with Temporary Password', async () => {
      // Create manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Auth',
          last_name: 'Test',
          email: 'auth.test@gmail.com',
          phone: '+22670333340',
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

    await runTest('Change Temporary Password - Success', async () => {
      // Create manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Change',
          last_name: 'Test',
          email: 'change.test@gmail.com',
          phone: '+22670333341',
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

    await runTest('Change Temporary Password - Wrong Current Password', async () => {
      // Create manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Wrong',
          last_name: 'Test',
          email: 'wrong.test@gmail.com',
          phone: '+22670333342',
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

    await runTest('Change Temporary Password - Password Mismatch', async () => {
      // Create manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Mismatch',
          last_name: 'Test',
          email: 'mismatch.test@gmail.com',
          phone: '+22670333343',
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

    // ========================================
    // SCHOOL MANAGEMENT TESTS
    // ========================================
    await runTest('Create School - Success', async () => {
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

    await runTest('Get All Schools', async () => {
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

    // ========================================
    // USER MANAGEMENT TESTS
    // ========================================
    await runTest('Get All Users - Super Admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      if (response.status !== 200) throw new Error('Get users failed');
      if (!Array.isArray(response.body.data)) throw new Error('Should return array');
    });

    // ========================================
    // ERROR HANDLING TESTS
    // ========================================
    await runTest('404 - Not Found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      if (response.status !== 404) throw new Error('Should return 404 for non-existent user');
    });

    await runTest('401 - Unauthorized', async () => {
      const response = await request(app)
        .get('/api/users');

      if (response.status !== 401) throw new Error('Should return 401 without token');
    });

    await runTest('403 - Forbidden', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${schoolAdminToken}`); // School admin can't get all users

      if (response.status !== 403) throw new Error('Should return 403 for insufficient permissions');
    });

    // ========================================
    // SECURITY TESTS
    // ========================================
    await runTest('Password Hashing', async () => {
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

    await runTest('Token Validation', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid_token_here');

      if (response.status !== 401) throw new Error('Should reject invalid token');
    });

    // ========================================
    // INTEGRATION TESTS
    // ========================================
    await runTest('Complete Canteen Manager Workflow', async () => {
      // 1. Create canteen manager
      const createResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Workflow',
          last_name: 'Test',
          email: 'workflow.test@gmail.com',
          phone: '+22670333344',
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

      // 5. Reset password (admin)
      const resetResponse = await request(app)
        .post(`/api/users/canteen-managers/${managerId}/reset-password`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      if (resetResponse.status !== 200) throw new Error('Step 5: Password reset failed');

      // 6. Delete manager
      const deleteResponse = await request(app)
        .delete(`/api/users/canteen-managers/${managerId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      if (deleteResponse.status !== 200) throw new Error('Step 6: Delete manager failed');

      console.log('   ✅ Complete workflow successful');
    });

    // ========================================
    // PERFORMANCE TESTS
    // ========================================
    await runTest('Concurrent Requests', async () => {
      const promises = [];
      
      // Create 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/users/canteen-managers')
            .set('Authorization', `Bearer ${schoolAdminToken}`)
            .send({
              first_name: `Concurrent${i}`,
              last_name: 'Test',
              email: `concurrent${i}.test@gmail.com`,
              phone: `+226703333${45 + i}`,
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

    // Clean up
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();

  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }

  // Results
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! API is working correctly!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Please check the implementation.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
