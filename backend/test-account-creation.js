const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Set test environment
process.env.NODE_ENV = 'test';

// Test configuration
const TEST_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/dabali',
  API_URL: 'http://localhost:5000'
};

// Test data
const testUsers = {
  superAdmin: {
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@gmail.com', // Use gmail email for tests
    password: 'Admin123!',
    role: 'SUPER_ADMIN'
  },
  schoolAdmin: {
    first_name: 'School',
    last_name: 'Admin',
    email: 'school.admin@gmail.com',
    password: 'SchoolAdmin123!',
    role: 'SCHOOL_ADMIN'
  },
  parent: {
    first_name: 'Parent',
    last_name: 'Test',
    email: 'parent.test@gmail.com',
    password: 'ParentTest123!',
    role: 'PARENT'
  },
  canteenManager: {
    first_name: 'Canteen',
    last_name: 'Manager',
    email: 'canteen.manager@gmail.com',
    phone: '+22670333333',
    role: 'CANTEEN_MANAGER'
  }
};

const testSchool = {
  name: 'École Test Comptes',
  address: 'Adresse Test',
  city: 'Ouagadougou',
  adminName: 'Admin Test',
  studentCount: 100,
  status: 'active'
};

class AccountCreationTester {
  constructor() {
    this.tokens = {};
    this.ids = {};
  }

  async setup() {
    console.log('🔧 Setting up account creation test environment...');
    
    // Connect to database
    await mongoose.connect(TEST_CONFIG.MONGODB_URI);
    console.log('📦 Connected to test database');
    
    // Clean test data (but keep super admin)
    if (mongoose.connection.db) {
      await mongoose.connection.db.collection('schools').deleteMany({});
      await mongoose.connection.db.collection('users').deleteMany({ 
        role: { $ne: 'SUPER_ADMIN' } // Keep super admin
      });
    }
    console.log('🧹 Test data cleaned');
    
    // Check if super admin already exists
    console.log('Checking for existing super admin...');
    const existingSuperAdmin = await mongoose.connection.db.collection('users').findOne({ 
      role: 'SUPER_ADMIN' 
    });
    
    if (existingSuperAdmin) {
      console.log('Found existing super admin:', existingSuperAdmin.email);
      testUsers.superAdmin.email = existingSuperAdmin.email;
      testUsers.superAdmin.password = 'Admin123!'; // Try default password
      console.log('Using existing super admin');
    } else {
      // Create default super admin
      console.log('Creating default super admin...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123!', salt);
      
      await mongoose.connection.db.collection('users').insertOne({
        first_name: 'Super',
        last_name: 'Admin',
        email: 'admin@dabali.bf',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      testUsers.superAdmin.email = 'admin@dabali.bf';
      testUsers.superAdmin.password = 'Admin123!';
      console.log('Default super admin created');
    }
    
    // Login as super admin
    console.log('Attempting super admin login...');
    
    // Check if user exists
    const existingUser = await mongoose.connection.db.collection('users').findOne({ 
      email: testUsers.superAdmin.email 
    });
    
    if (!existingUser) {
      throw new Error('Test super admin not found in database');
    }
    
    console.log('Super admin user found:', existingUser.email);
    console.log('Super admin role:', existingUser.role);
    
    // Test password comparison directly
    const isPasswordValid = await bcrypt.compare(testUsers.superAdmin.password, existingUser.password);
    console.log('Password comparison result:', isPasswordValid);
    
    if (!isPasswordValid) {
      throw new Error('Password hash comparison failed - password not hashed correctly');
    }
    
    const loginResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: testUsers.superAdmin.email,
        password: testUsers.superAdmin.password
      });
    
    console.log('Super admin login response status:', loginResponse.status);
    console.log('Super admin login response body:', JSON.stringify(loginResponse.body, null, 2));
    
    if (loginResponse.status !== 200 || !loginResponse.body.token) {
      throw new Error(`Super admin login failed: ${JSON.stringify(loginResponse.body)}`);
    }
    
    this.tokens.superAdmin = loginResponse.body.token;
    
    // Create school
    const schoolResult = await mongoose.connection.db.collection('schools').insertOne({
      ...testSchool,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    this.ids.school = schoolResult.insertedId.toString();
    
    console.log('✅ Account creation test setup completed');
  }

  async cleanup() {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
    console.log('🧹 Account creation test cleanup completed');
  }

  // Test: Create School Admin account
  async testCreateSchoolAdmin() {
    console.log('Testing School Admin account creation...');
    
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/schools')
      .set('Authorization', `Bearer ${this.tokens.superAdmin}`)
      .send({
        ...testSchool,
        adminName: `${testUsers.schoolAdmin.first_name} ${testUsers.schoolAdmin.last_name}`,
        adminEmail: testUsers.schoolAdmin.email,
        adminPassword: testUsers.schoolAdmin.password
      });

    console.log('School creation response status:', response.status);
    console.log('School creation response body:', JSON.stringify(response.body, null, 2));

    if (response.status !== 201) {
      throw new Error(`School creation failed: ${JSON.stringify(response.body)}`);
    }

    // Verify school admin was created
    const adminUser = await mongoose.connection.db.collection('users').findOne({ 
      email: testUsers.schoolAdmin.email 
    });

    if (!adminUser) {
      throw new Error('School admin user not found in database');
    }

    if (adminUser.role !== 'SCHOOL_ADMIN') {
      throw new Error('School admin role incorrect');
    }

    // Test login as school admin
    const loginResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: testUsers.schoolAdmin.email,
        password: testUsers.schoolAdmin.password
      });

    if (loginResponse.status !== 200 || !loginResponse.body.token) {
      throw new Error('School admin login failed');
    }

    this.tokens.schoolAdmin = loginResponse.body.token;
    this.ids.schoolAdmin = adminUser._id.toString();

    console.log('✅ School Admin account created and login successful');
  }

  // Test: Create Parent account via registration
  async testCreateParentAccount() {
    console.log('Testing Parent account creation via registration...');
    
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/register')
      .send({
        first_name: testUsers.parent.first_name,
        last_name: testUsers.parent.last_name,
        email: testUsers.parent.email,
        password: testUsers.parent.password,
        role: 'PARENT'
      });

    if (response.status !== 201) {
      throw new Error(`Parent registration failed: ${JSON.stringify(response.body)}`);
    }

    // Verify parent was created
    const parentUser = await mongoose.connection.db.collection('users').findOne({ 
      email: testUsers.parent.email 
    });

    if (!parentUser) {
      throw new Error('Parent user not found in database');
    }

    if (parentUser.role !== 'PARENT') {
      throw new Error('Parent role incorrect');
    }

    // Test login as parent
    const loginResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: testUsers.parent.email,
        password: testUsers.parent.password
      });

    if (loginResponse.status !== 200 || !loginResponse.body.token) {
      throw new Error('Parent login failed');
    }

    this.tokens.parent = loginResponse.body.token;
    this.ids.parent = parentUser._id.toString();

    console.log('✅ Parent account created and login successful');
  }

  // Test: Create Canteen Manager account
  async testCreateCanteenManager() {
    console.log('Testing Canteen Manager account creation...');
    
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        ...testUsers.canteenManager,
        school_id: this.ids.school
      });

    if (response.status !== 201) {
      throw new Error(`Canteen manager creation failed: ${JSON.stringify(response.body)}`);
    }

    if (!response.body.data.temporary_password) {
      throw new Error('No temporary password generated for canteen manager');
    }

    // Verify canteen manager was created
    const managerUser = await mongoose.connection.db.collection('users').findOne({ 
      email: testUsers.canteenManager.email 
    });

    if (!managerUser) {
      throw new Error('Canteen manager user not found in database');
    }

    if (managerUser.role !== 'CANTEEN_MANAGER') {
      throw new Error('Canteen manager role incorrect');
    }

    // Test login with temporary password
    const loginResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: testUsers.canteenManager.email,
        password: response.body.data.temporary_password
      });

    if (loginResponse.status !== 200 || !loginResponse.body.token) {
      throw new Error('Canteen manager login with temporary password failed');
    }

    this.tokens.canteenManager = loginResponse.body.token;
    this.ids.canteenManager = managerUser._id.toString();
    this.temporaryPassword = response.body.data.temporary_password;

    console.log('✅ Canteen Manager account created and login with temporary password successful');
  }

  // Test: Change temporary password for canteen manager
  async testChangeCanteenManagerPassword() {
    console.log('Testing Canteen Manager password change...');
    
    const newPassword = 'NewPassword123!';
    
    const response = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/change-temporary-password')
      .set('Authorization', `Bearer ${this.tokens.canteenManager}`)
      .send({
        currentPassword: this.temporaryPassword,
        newPassword: newPassword,
        confirmPassword: newPassword
      });

    if (response.status !== 200) {
      throw new Error(`Password change failed: ${JSON.stringify(response.body)}`);
    }

    // Test login with new password
    const loginResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: testUsers.canteenManager.email,
        password: newPassword
      });

    if (loginResponse.status !== 200 || !loginResponse.body.token) {
      throw new Error('Login with new password failed');
    }

    // Test that old password no longer works
    const oldPasswordLoginResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/login')
      .send({
        email: testUsers.canteenManager.email,
        password: this.temporaryPassword
      });

    if (oldPasswordLoginResponse.status !== 401) {
      throw new Error('Old password should no longer work');
    }

    console.log('✅ Canteen Manager password change successful');
  }

  // Test: Validate email requirements for canteen managers
  async testCanteenManagerEmailValidation() {
    console.log('Testing Canteen Manager email validation...');
    
    const invalidEmails = [
      'manager@yahoo.com',
      'manager@hotmail.com',
      'manager@school.bf',
      'manager@orange.bf',
      'manager@test.org'
    ];

    for (const email of invalidEmails) {
      const response = await request(TEST_CONFIG.API_URL)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
        .send({
          first_name: 'Test',
          last_name: 'Manager',
          email: email,
          phone: '+22670333334',
          school_id: this.ids.school
        });

      if (response.status !== 400) {
        throw new Error(`Should reject email ${email}`);
      }

      if (!response.body.message.includes('gmail')) {
        throw new Error(`Error message should mention gmail requirement for ${email}`);
      }
    }

    // Test valid gmail email
    const validResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        first_name: 'Valid',
        last_name: 'Manager',
        email: 'valid.manager@gmail.com',
        phone: '+22670333335',
        school_id: this.ids.school
      });

    if (validResponse.status !== 201) {
      throw new Error('Should accept valid gmail email');
    }

    console.log('✅ Canteen Manager email validation working correctly');
  }

  // Test: Duplicate email prevention
  async testDuplicateEmailPrevention() {
    console.log('Testing duplicate email prevention...');
    
    // Try to create parent with existing email
    const duplicateParentResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/auth/register')
      .send({
        first_name: 'Duplicate',
        last_name: 'Parent',
        email: testUsers.parent.email, // Same email as existing parent
        password: 'Duplicate123!',
        role: 'PARENT'
      });

    if (duplicateParentResponse.status !== 409) {
      throw new Error('Should prevent duplicate parent email');
    }

    // Try to create canteen manager with existing email
    const duplicateManagerResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        first_name: 'Duplicate',
        last_name: 'Manager',
        email: testUsers.canteenManager.email, // Same email as existing manager
        phone: '+22670333336',
        school_id: this.ids.school
      });

    if (duplicateManagerResponse.status !== 400) {
      throw new Error('Should prevent duplicate canteen manager email');
    }

    console.log('✅ Duplicate email prevention working correctly');
  }

  // Test: Account role permissions
  async testAccountRolePermissions() {
    console.log('Testing account role permissions...');
    
    // Test parent cannot create canteen manager
    const parentCreateManagerResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.parent}`)
      .send({
        first_name: 'Unauthorized',
        last_name: 'Manager',
        email: 'unauthorized@gmail.com',
        phone: '+22670333337',
        school_id: this.ids.school
      });

    if (parentCreateManagerResponse.status !== 403) {
      throw new Error('Parent should not be able to create canteen manager');
    }

    // Test canteen manager cannot create other canteen managers
    const managerCreateManagerResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.canteenManager}`)
      .send({
        first_name: 'Unauthorized',
        last_name: 'Manager',
        email: 'unauthorized2@gmail.com',
        phone: '+22670333338',
        school_id: this.ids.school
      });

    if (managerCreateManagerResponse.status !== 403) {
      throw new Error('Canteen manager should not be able to create other canteen managers');
    }

    // Test school admin can create canteen manager (already tested above, but verify again)
    const schoolAdminCreateManagerResponse = await request(TEST_CONFIG.API_URL)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${this.tokens.schoolAdmin}`)
      .send({
        first_name: 'Authorized',
        last_name: 'Manager',
        email: 'authorized@gmail.com',
        phone: '+22670333339',
        school_id: this.ids.school
      });

    if (schoolAdminCreateManagerResponse.status !== 201) {
      throw new Error('School admin should be able to create canteen manager');
    }

    console.log('✅ Account role permissions working correctly');
  }

  async runAllTests() {
    console.log('🚀 Starting Account Creation Test Suite...\n');

    const tests = [
      { name: 'Create School Admin Account', fn: () => this.testCreateSchoolAdmin() },
      { name: 'Create Parent Account', fn: () => this.testCreateParentAccount() },
      { name: 'Create Canteen Manager Account', fn: () => this.testCreateCanteenManager() },
      { name: 'Change Canteen Manager Password', fn: () => this.testChangeCanteenManagerPassword() },
      { name: 'Canteen Manager Email Validation', fn: () => this.testCanteenManagerEmailValidation() },
      { name: 'Duplicate Email Prevention', fn: () => this.testDuplicateEmailPrevention() },
      { name: 'Account Role Permissions', fn: () => this.testAccountRolePermissions() }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error.message}`);
        failed++;
      }
    }

    console.log('\n📊 Account Creation Test Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Total: ${passed + failed}`);
    console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    return { passed, failed, total: passed + failed };
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new AccountCreationTester();
  
  tester.setup()
    .then(() => tester.runAllTests())
    .then((results) => {
      if (results.failed > 0) {
        console.log('\n💥 Some account creation tests failed. Please check the implementation.');
        process.exit(1);
      } else {
        console.log('\n🎉 All account creation tests passed!');
        process.exit(0);
      }
    })
    .catch(async (error) => {
      console.error('\n💥 Account creation test suite failed:', error.message);
      await tester.cleanup();
      process.exit(1);
    });
}

module.exports = AccountCreationTester;
