const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Set test environment
process.env.NODE_ENV = 'test';

// Test configuration
const TEST_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/dabali', // Use same DB as server
  API_URL: 'http://localhost:5000'
};

// Test data
const testUsers = {
  superAdmin: {
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@dabali.bf', // Use existing admin
    password: 'Admin123!', // Use existing password
    role: 'SUPER_ADMIN'
  },
  schoolAdmin: {
    first_name: 'Koné',
    last_name: 'Ibrahim',
    email: 'kone.ibrahim@gmail.com', // Valid gmail email
    password: 'Admin123!',
    role: 'SCHOOL_ADMIN'
  },
  canteenManager: {
    first_name: 'Traoré',
    last_name: 'Moussa',
    email: 'moussa.traore@gmail.com',
    phone: '+22670333333',
    role: 'CANTEEN_MANAGER'
  }
};

const testSchool = {
  name: 'École Primaire de Ouagadougou',
  address: '123 Rue Test',
  city: 'Ouagadougou'
};

class APITester {
  constructor() {
    this.tokens = {};
    this.ids = {};
    this.testResults = { passed: 0, failed: 0, total: 0 };
  }

  async runTest(testName, testFn) {
    this.testResults.total++;
    try {
      await testFn();
      console.log(`✅ ${testName}`);
      this.testResults.passed++;
    } catch (error) {
      console.log(`❌ ${testName}`);
      console.log(`   Error: ${error.message}`);
      this.testResults.failed++;
    }
  }

  async setup() {
    console.log('🔧 Setting up test environment...');
    
    // Connect to database
    await mongoose.connect(TEST_CONFIG.MONGODB_URI);
    console.log('📦 Connected to test database');
    
    // Don't clean up database completely - we need the existing admin
    // Just clean test data
    if (mongoose.connection.db) {
      await mongoose.connection.db.collection('schools').deleteMany({});
      await mongoose.connection.db.collection('users').deleteMany({ 
        email: { $ne: 'admin@dabali.bf' } // Keep the default admin
      });
    }
    console.log('🧹 Test data cleaned');
    
    // Login as existing super admin
    const loginResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: testUsers.superAdmin.email,
        password: testUsers.superAdmin.password
      });
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status}: ${JSON.stringify(loginResponse.body)}`);
    }
    
    if (!loginResponse.body.token) {
      throw new Error(`No token in login response: ${JSON.stringify(loginResponse.body)}`);
    }
    
    this.tokens.superAdmin = loginResponse.body.token;
    
    // Create school
    const schoolResult = await mongoose.connection.db.collection('schools').insertOne({
      ...testSchool,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    this.ids.school = schoolResult.insertedId.toString();
    
    // Create school admin
    const schoolAdminHashedPassword = await bcrypt.hash(testUsers.schoolAdmin.password, 10);
    await mongoose.connection.db.collection('users').insertOne({
      ...testUsers.schoolAdmin,
      password: schoolAdminHashedPassword,
      school_id: new mongoose.Types.ObjectId(this.ids.school),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Login as school admin
    const schoolAdminLoginResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: testUsers.schoolAdmin.email,
        password: testUsers.schoolAdmin.password
      });
    
    this.tokens.schoolAdmin = schoolAdminLoginResponse.body.token;
    
    console.log('✅ Setup completed');
  }

  async cleanup() {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
    console.log('🧹 Cleanup completed');
  }

  async printResults() {
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Total: ${this.testResults.total}`);
    console.log(`🎯 Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed! API is working correctly!');
      return true;
    } else {
      console.log('\n💥 Some tests failed. Please check the implementation.');
      return false;
    }
  }

  // Test methods
  async testHealthCheck() {
    const response = await request(TEST_CONFIG.API_URL).get('/api/health');
    if (response.status !== 200) throw new Error('Health check failed');
    if (!response.body.success) throw new Error('Health check not successful');
  }

  async testCreateCanteenManager() {
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        ...testUsers.canteenManager,
        school_id: this.ids.school
      });

    console.log('Create manager response status:', response.status);
    console.log('Create manager response body:', JSON.stringify(response.body, null, 2));

    if (response.status !== 201) throw new Error('Create canteen manager failed');
    if (!response.body.data.temporary_password) throw new Error('No temporary password generated');
    
    this.ids.canteenManager = response.body.data.user.id;
  }

  async testRejectNonGmailEmail() {
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        ...testUsers.canteenManager,
        email: 'test@yahoo.com', // Invalid email
        school_id: this.ids.school
      });

    if (response.status !== 400) throw new Error('Should reject non-gmail email');
    if (response.body.message !== 'Seuls les emails se terminant par @gmail.com sont autorisés.') {
      throw new Error('Wrong error message for invalid email');
    }
  }

  async testRejectSchoolBfEmail() {
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        ...testUsers.canteenManager,
        email: 'test@school.bf', // Invalid email
        school_id: this.ids.school
      });

    if (response.status !== 400) throw new Error('Should reject school.bf email');
  }

  async testMissingFields() {
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        first_name: 'Test',
        // Missing required fields
      });

    if (response.status !== 400) throw new Error('Should reject missing fields');
  }

  async testUnauthorizedAccess() {
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .send({
        ...testUsers.canteenManager,
        school_id: this.ids.school
      });

    if (response.status !== 401) throw new Error('Should reject unauthorized access');
  }

  async testGetCanteenManagers() {
    // Create a manager first
    await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        ...testUsers.canteenManager,
        email: 'manager.test@gmail.com',
        school_id: this.ids.school
      });

    const response = await request(TEST_CONFIG.API_URL)
      .get(`/api/users/canteen-managers/school/${this.ids.school}`)
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`);

    if (response.status !== 200) throw new Error('Get managers failed');
    if (!Array.isArray(response.body.data)) throw new Error('Should return array');
    if (response.body.data.length === 0) throw new Error('Should return at least one manager');
  }

  async testResetPassword() {
    // Create manager
    const createResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        ...testUsers.canteenManager,
        email: 'reset.test@gmail.com',
        school_id: this.ids.school
      });

    const managerId = createResponse.body.data.user.id;

    const response = await request(TEST_CONFIG.API_URL)
      .post(`/api/users/canteen-managers/${managerId}/reset-password`)
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`);

    if (response.status !== 200) throw new Error('Password reset failed');
    if (!response.body.data.temporary_password) throw new Error('No new temporary password');
  }

  async testDeleteCanteenManager() {
    // Create manager
    const createResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        ...testUsers.canteenManager,
        email: 'delete.test@gmail.com',
        school_id: this.ids.school
      });

    const managerId = createResponse.body.data.user.id;

    const response = await request(TEST_CONFIG.API_URL)
      .delete(`/api/users/canteen-managers/${managerId}`)
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`);

    if (response.status !== 200) throw new Error('Delete manager failed');
  }

  async testCanteenManagerLogin() {
    // Create manager
    const createResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        ...testUsers.canteenManager,
        email: 'login.test@gmail.com',
        school_id: this.ids.school
      });

    const temporaryPassword = createResponse.body.data.temporary_password;

    // Login
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: 'login.test@gmail.com',
        password: temporaryPassword
      });

    if (response.status !== 200) throw new Error('Login with temporary password failed');
    
    this.tokens.canteenManager = response.body.data.token;
  }

  async testChangeTemporaryPassword() {
    // Create manager
    const createResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        ...testUsers.canteenManager,
        email: 'change.test@gmail.com',
        school_id: this.ids.school
      });

    const temporaryPassword = createResponse.body.data.temporary_password;

    // Login
    const loginResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: 'change.test@gmail.com',
        password: temporaryPassword
      });

    const token = loginResponse.body.data.token;

    // Change password
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/change-temporary-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        current_password: temporaryPassword,
        new_password: 'NewSecurePass123!',
        confirm_password: 'NewSecurePass123!'
      });

    if (response.status !== 200) throw new Error('Password change failed');
  }

  async testWrongCurrentPassword() {
    // Create manager
    const createResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        ...testUsers.canteenManager,
        email: 'wrong.test@gmail.com',
        school_id: this.ids.school
      });

    const temporaryPassword = createResponse.body.data.temporary_password;

    // Login
    const loginResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: 'wrong.test@gmail.com',
        password: temporaryPassword
      });

    const token = loginResponse.body.data.token;

    // Try change with wrong password
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/change-temporary-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        current_password: 'WrongPassword123!',
        new_password: 'NewSecurePass123!',
        confirm_password: 'NewSecurePass123!'
      });

    if (response.status !== 400) throw new Error('Should reject wrong current password');
  }

  async testPasswordMismatch() {
    // Create manager
    const createResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        ...testUsers.canteenManager,
        email: 'mismatch.test@gmail.com',
        school_id: this.ids.school
      });

    const temporaryPassword = createResponse.body.data.temporary_password;

    // Login
    const loginResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: 'mismatch.test@gmail.com',
        password: temporaryPassword
      });

    const token = loginResponse.body.data.token;

    // Try change with mismatched passwords
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/change-temporary-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        current_password: temporaryPassword,
        new_password: 'NewSecurePass123!',
        confirm_password: 'DifferentPass123!'
      });

    if (response.status !== 400) throw new Error('Should reject password mismatch');
  }

  async testCreateSchool() {
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/schools')
      .set('Authorization', `Bearer ${this.tokens.superAdmin}`)
      .send({
        name: 'École Secondaire de Bobo',
        address: '456 Avenue Test',
        city: 'Bobo-Dioulasso'
      });

    if (response.status !== 201) throw new Error('Create school failed');
    if (!response.body.data.school.name) throw new Error('School name missing');
  }

  async testGetAllSchools() {
    // Create a school first
    await request(TEST_CONFIG.API_URL)
      .post('/api/schools')
      .set('Authorization', `Bearer ${this.tokens.superAdmin}`)
      .send({
        name: 'Test School',
        address: '123 Test St',
        city: 'Test City'
      });

    const response = await request(TEST_CONFIG.API_URL)
      .get('/api/schools')
      .set('Authorization', `Bearer ${this.tokens.superAdmin}`);

    if (response.status !== 200) throw new Error('Get schools failed');
    if (!Array.isArray(response.body.data)) throw new Error('Should return array');
  }

  async testGetAllUsers() {
    const response = await request(TEST_CONFIG.API_URL)
      .get('/api/users')
      .set('Authorization', `Bearer ${this.tokens.superAdmin}`);

    if (response.status !== 200) throw new Error('Get users failed');
    if (!Array.isArray(response.body.data)) throw new Error('Should return array');
  }

  async test404NotFound() {
    const fakeId = new mongoose.Types.ObjectId().toString();
    
    const response = await request(TEST_CONFIG.API_URL)
      .get(`/api/users/${fakeId}`)
      .set('Authorization', `Bearer ${this.tokens.superAdmin}`);

    if (response.status !== 404) throw new Error('Should return 404 for non-existent user');
  }

  async test401Unauthorized() {
    const response = await request(TEST_CONFIG.API_URL)
      .get('/api/users');

    if (response.status !== 401) throw new Error('Should return 401 without token');
  }

  async test403Forbidden() {
    const response = await request(TEST_CONFIG.API_URL)
      .get('/api/users')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`); // School admin can't get all users

    if (response.status !== 403) throw new Error('Should return 403 for insufficient permissions');
  }

  async testPasswordHashing() {
    // Create a user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    
    await mongoose.connection.db.collection('users').insertOne({
      first_name: 'Security',
      last_name: 'Test',
      email: 'security.test@gmail.com',
      password: hashedPassword,
      role: 'PARENT',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Try to login with wrong password
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: 'security.test@gmail.com',
        password: 'WrongPassword123!'
      });

    if (response.status !== 401) throw new Error('Should reject wrong password');
  }

  async testTokenValidation() {
    const response = await request(TEST_CONFIG.API_URL)
      .get('/api/users')
      .set('Authorization', 'Bearer invalid_token_here');

    if (response.status !== 401) throw new Error('Should reject invalid token');
  }

  async testCompleteWorkflow() {
    // 1. Create canteen manager
    const createResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        ...testUsers.canteenManager,
        email: 'workflow.test@gmail.com',
        school_id: this.ids.school
      });

    if (createResponse.status !== 201) throw new Error('Step 1: Create manager failed');
    
    const temporaryPassword = createResponse.body.data.temporary_password;
    const managerId = createResponse.body.data.user.id;

    // 2. Login with temporary password
    const loginResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: 'workflow.test@gmail.com',
        password: temporaryPassword
      });

    if (loginResponse.status !== 200) throw new Error('Step 2: Login failed');
    
    const token = loginResponse.body.data.token;

    // 3. Change password
    const changeResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/change-temporary-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        current_password: temporaryPassword,
        new_password: 'WorkflowPass123!',
        confirm_password: 'WorkflowPass123!'
      });

    if (changeResponse.status !== 200) throw new Error('Step 3: Password change failed');

    // 4. Login with new password
    const newLoginResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: 'workflow.test@gmail.com',
        password: 'WorkflowPass123!'
      });

    if (newLoginResponse.status !== 200) throw new Error('Step 4: Login with new password failed');

    // 5. Reset password (admin)
    const resetResponse = await request(TEST_CONFIG.API_URL)
      .post(`/api/users/canteen-managers/${managerId}/reset-password`)
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`);

    if (resetResponse.status !== 200) throw new Error('Step 5: Password reset failed');

    // 6. Delete manager
    const deleteResponse = await request(TEST_CONFIG.API_URL)
      .delete(`/api/users/canteen-managers/${managerId}`)
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`);

    if (deleteResponse.status !== 200) throw new Error('Step 6: Delete manager failed');

    console.log('   ✅ Complete workflow successful');
  }

  async testConcurrentRequests() {
    const promises = [];
    
    // Create 5 concurrent requests
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(TEST_CONFIG.API_URL)
          .post('/api/users/canteen-managers')
          .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
          .send({
            ...testUsers.canteenManager,
            first_name: `Concurrent${i}`,
            email: `concurrent${i}.test@gmail.com`,
            phone: `+226703333${45 + i}`,
            school_id: this.ids.school
          })
      );
    }

    const results = await Promise.all(promises);
    
    // All should succeed
    for (let i = 0; i < results.length; i++) {
      if (results[i].status !== 201) throw new Error(`Concurrent request ${i} failed`);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Complete API Test Suite...\n');

    try {
      await this.setup();

      // Health Check
      await this.runTest('Health Check API', () => this.testHealthCheck());

      // Canteen Manager Tests
      await this.runTest('Create Canteen Manager - Success', () => this.testCreateCanteenManager());
      await this.runTest('Reject Non-Gmail Email (@yahoo.com)', () => this.testRejectNonGmailEmail());
      await this.runTest('Reject School.bf Email', () => this.testRejectSchoolBfEmail());
      await this.runTest('Reject Missing Fields', () => this.testMissingFields());
      await this.runTest('Reject Unauthorized Access', () => this.testUnauthorizedAccess());
      await this.runTest('Get Canteen Managers by School', () => this.testGetCanteenManagers());
      await this.runTest('Reset Canteen Manager Password', () => this.testResetPassword());
      await this.runTest('Delete Canteen Manager', () => this.testDeleteCanteenManager());

      // Authentication Tests
      await this.runTest('Canteen Manager Login with Temporary Password', () => this.testCanteenManagerLogin());
      await this.runTest('Change Temporary Password - Success', () => this.testChangeTemporaryPassword());
      await this.runTest('Change Temporary Password - Wrong Current Password', () => this.testWrongCurrentPassword());
      await this.runTest('Change Temporary Password - Password Mismatch', () => this.testPasswordMismatch());

      // School Management Tests
      await this.runTest('Create School - Success', () => this.testCreateSchool());
      await this.runTest('Get All Schools', () => this.testGetAllSchools());

      // User Management Tests
      await this.runTest('Get All Users - Super Admin', () => this.testGetAllUsers());

      // Error Handling Tests
      await this.runTest('404 - Not Found', () => this.test404NotFound());
      await this.runTest('401 - Unauthorized', () => this.test401Unauthorized());
      await this.runTest('403 - Forbidden', () => this.test403Forbidden());

      // Security Tests
      await this.runTest('Password Hashing', () => this.testPasswordHashing());
      await this.runTest('Token Validation', () => this.testTokenValidation());

      // Integration Tests
      await this.runTest('Complete Canteen Manager Workflow', () => this.testCompleteWorkflow());

      // Performance Tests
      await this.runTest('Concurrent Requests', () => this.testConcurrentRequests());

      await this.cleanup();
      return await this.printResults();

    } catch (error) {
      console.error('💥 Test suite failed:', error);
      await this.cleanup();
      return false;
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new APITester();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = APITester;
