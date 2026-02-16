const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import app directly
const app = require('./dist/server.js').default;

async function runTests() {
  console.log('🚀 Starting Canteen Manager API Tests...\n');
  
  let schoolAdminToken;
  let schoolId;
  let testResults = { passed: 0, failed: 0, total: 0 };

  // Helper function to run a test
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

  // Connect to database
  await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/dabali-test');
  console.log('📦 Connected to test database');

  // Clean up database
  await mongoose.connection.db.dropDatabase();
  console.log('🧹 Database cleaned');

  // Test 1: Health Check
  await runTest('Health Check API', async () => {
    const response = await request(app)
      .get('/api/health');
    
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.body.success) throw new Error('Expected success: true');
    if (response.body.message !== 'API is running') throw new Error('Wrong message');
  });

  // Test 2: Setup School Admin
  await runTest('Create School Admin and Login', async () => {
    // Create school
    const db = mongoose.connection.db;
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
      email: 'kone.ibrahim@school.bf',
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
        email: 'kone.ibrahim@school.bf',
        password: 'Admin123!'
      });

    if (loginResponse.status !== 200) throw new Error(`Login failed: ${loginResponse.status}`);
    if (!loginResponse.body.data.token) throw new Error('No token received');
    
    schoolAdminToken = loginResponse.body.data.token;
  });

  // Test 3: Create Canteen Manager
  await runTest('Create Canteen Manager', async () => {
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

    if (response.status !== 201) throw new Error(`Expected 201, got ${response.status}`);
    if (!response.body.success) throw new Error('Expected success: true');
    if (response.body.data.user.first_name !== 'Traoré') throw new Error('Wrong first name');
    if (response.body.data.user.role !== 'CANTEEN_MANAGER') throw new Error('Wrong role');
    if (!response.body.data.temporary_password) throw new Error('No temporary password');
  });

  // Test 4: Duplicate Email Validation
  await runTest('Reject Duplicate Email', async () => {
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

    // Try duplicate
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

    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    if (response.body.message !== 'Un utilisateur avec cet email existe déjà.') {
      throw new Error('Wrong error message');
    }
  });

  // Test 5: Required Fields Validation
  await runTest('Validate Required Fields', async () => {
    const response = await request(app)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        first_name: 'Traoré',
        // Missing required fields
      });

    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
    if (response.body.message !== 'Prénom, nom, email et école sont requis.') {
      throw new Error('Wrong validation message');
    }
  });

  // Test 6: Unauthorized Access
  await runTest('Reject Unauthorized Access', async () => {
    const response = await request(app)
      .post('/api/users/canteen-managers')
      .send({
        first_name: 'Traoré',
        last_name: 'Moussa',
        email: 'moussa.traore@school.bf',
        phone: '+22670333333',
        school_id: schoolId
      });

    if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
  });

  // Test 7: Canteen Manager Login and Password Change
  await runTest('Canteen Manager Login and Password Change', async () => {
    // Create manager
    const createResponse = await request(app)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        first_name: 'Traoré',
        last_name: 'Moussa',
        email: 'moussa.traore2@school.bf',
        phone: '+22670333334',
        school_id: schoolId
      });

    const temporaryPassword = createResponse.body.data.temporary_password;

    // Login with temporary password
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'moussa.traore2@school.bf',
        password: temporaryPassword
      });

    if (loginResponse.status !== 200) throw new Error('Login with temporary password failed');
    
    const canteenManagerToken = loginResponse.body.data.token;

    // Change password
    const changeResponse = await request(app)
      .post('/api/auth/change-temporary-password')
      .set('Authorization', `Bearer ${canteenManagerToken}`)
      .send({
        current_password: temporaryPassword,
        new_password: 'NewSecurePass123!',
        confirm_password: 'NewSecurePass123!'
      });

    if (changeResponse.status !== 200) throw new Error('Password change failed');
    if (!changeResponse.body.success) throw new Error('Password change not successful');
  });

  // Test 8: Get Canteen Managers
  await runTest('Get Canteen Managers by School', async () => {
    const response = await request(app)
      .get(`/api/users/canteen-managers/school/${schoolId}`)
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!Array.isArray(response.body.data)) throw new Error('Expected array of managers');
    if (response.body.data.length === 0) throw new Error('Expected at least one manager');
    if (response.body.data[0].password !== undefined) throw new Error('Password should be excluded');
  });

  // Test 9: Password Reset
  await runTest('Reset Canteen Manager Password', async () => {
    // Create manager first
    const createResponse = await request(app)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        first_name: 'Test',
        last_name: 'Manager',
        email: 'test.manager@school.bf',
        phone: '+22670333335',
        school_id: schoolId
      });

    const managerId = createResponse.body.data.user.id;

    // Reset password
    const response = await request(app)
      .post(`/api/users/canteen-managers/${managerId}/reset-password`)
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.body.data.temporary_password) throw new Error('No new temporary password');
  });

  // Test 10: Delete Canteen Manager
  await runTest('Delete Canteen Manager', async () => {
    // Create manager first
    const createResponse = await request(app)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        first_name: 'Delete',
        last_name: 'Me',
        email: 'delete.me@school.bf',
        phone: '+22670333336',
        school_id: schoolId
      });

    const managerId = createResponse.body.data.user.id;

    // Delete manager
    const response = await request(app)
      .delete(`/api/users/canteen-managers/${managerId}`)
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.body.success) throw new Error('Delete not successful');
  });

  // Clean up
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();

  // Results
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Canteen Manager API is working correctly!');
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
