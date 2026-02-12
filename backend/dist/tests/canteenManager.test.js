"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = __importDefault(require("../server"));
const User_1 = __importDefault(require("../models/User"));
const School_1 = __importDefault(require("../models/School"));
describe('Canteen Manager Management', () => {
    let schoolAdminToken;
    let schoolId;
    let canteenManagerId;
    beforeAll(async () => {
        // Connect to test database
        await mongoose_1.default.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/dabali-test');
    });
    afterAll(async () => {
        // Clean up and disconnect
        await User_1.default.deleteMany({});
        await School_1.default.deleteMany({});
        await mongoose_1.default.disconnect();
    });
    beforeEach(async () => {
        // Clean up before each test
        await User_1.default.deleteMany({});
        await School_1.default.deleteMany({});
    });
    describe('Setup', () => {
        test('Should create school and admin for testing', async () => {
            // Create school
            const school = new School_1.default({
                name: 'École Primaire de Ouagadougou',
                address: '123 Rue Test',
                city: 'Ouagadougou'
            });
            await school.save();
            schoolId = school._id.toString();
            // Create school admin
            const admin = new User_1.default({
                first_name: 'Koné',
                last_name: 'Ibrahim',
                email: 'kone.ibrahim@school.bf',
                password: 'hashedPassword123',
                role: 'SCHOOL_ADMIN',
                school_id: schoolId
            });
            await admin.save();
            // Login as admin
            const loginResponse = await (0, supertest_1.default)(server_1.default)
                .post('/api/auth/login')
                .send({
                email: 'kone.ibrahim@school.bf',
                password: 'Admin123!'
            });
            schoolAdminToken = loginResponse.body.data.token;
            expect(schoolAdminToken).toBeDefined();
        });
    });
    describe('POST /api/users/canteen-managers', () => {
        test('Should create canteen manager successfully', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
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
            // Store ID for later tests
            canteenManagerId = response.body.data.user.id;
        });
        test('Should reject duplicate email', async () => {
            // Create first manager
            await (0, supertest_1.default)(server_1.default)
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
            const response = await (0, supertest_1.default)(server_1.default)
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
            const response = await (0, supertest_1.default)(server_1.default)
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
            const response = await (0, supertest_1.default)(server_1.default)
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
    describe('GET /api/users/canteen-managers/school/:school_id', () => {
        beforeEach(async () => {
            // Create a canteen manager for testing
            const manager = new User_1.default({
                first_name: 'Traoré',
                last_name: 'Moussa',
                email: 'moussa.traore@school.bf',
                password: 'hashedPassword123',
                role: 'CANTEEN_MANAGER',
                school_id: schoolId,
                is_temporary_password: true
            });
            await manager.save();
            canteenManagerId = manager._id.toString();
        });
        test('Should get canteen managers for school', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get(`/api/users/canteen-managers/school/${schoolId}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].first_name).toBe('Traoré');
            expect(response.body.data[0].last_name).toBe('Moussa');
            expect(response.body.data[0].role).toBe('CANTEEN_MANAGER');
            expect(response.body.data[0].password).toBeUndefined(); // Password should be excluded
        });
        test('Should reject unauthorized access', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get(`/api/users/canteen-managers/school/${schoolId}`);
            expect(response.status).toBe(401);
        });
    });
    describe('POST /api/users/canteen-managers/:id/reset-password', () => {
        beforeEach(async () => {
            // Create a canteen manager for testing
            const manager = new User_1.default({
                first_name: 'Traoré',
                last_name: 'Moussa',
                email: 'moussa.traore@school.bf',
                password: 'hashedPassword123',
                role: 'CANTEEN_MANAGER',
                school_id: schoolId,
                is_temporary_password: false
            });
            await manager.save();
            canteenManagerId = manager._id.toString();
        });
        test('Should reset password successfully', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post(`/api/users/canteen-managers/${canteenManagerId}/reset-password`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Mot de passe réinitialisé avec succès.');
            expect(response.body.data.temporary_password).toBeDefined();
            expect(response.body.data.temporary_password).toMatch(/^[A-Za-z0-9!@#$%^&*]{12}$/);
            // Verify password was reset in database
            const manager = await User_1.default.findById(canteenManagerId);
            expect(manager?.is_temporary_password).toBe(true);
        });
        test('Should reject non-existent manager', async () => {
            const fakeId = new mongoose_1.default.Types.ObjectId().toString();
            const response = await (0, supertest_1.default)(server_1.default)
                .post(`/api/users/canteen-managers/${fakeId}/reset-password`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Gestionnaire de cantine non trouvé.');
        });
    });
    describe('DELETE /api/users/canteen-managers/:id', () => {
        beforeEach(async () => {
            // Create a canteen manager for testing
            const manager = new User_1.default({
                first_name: 'Traoré',
                last_name: 'Moussa',
                email: 'moussa.traore@school.bf',
                password: 'hashedPassword123',
                role: 'CANTEEN_MANAGER',
                school_id: schoolId
            });
            await manager.save();
            canteenManagerId = manager._id.toString();
        });
        test('Should delete canteen manager successfully', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .delete(`/api/users/canteen-managers/${canteenManagerId}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Gestionnaire de cantine supprimé avec succès.');
            // Verify manager was deleted
            const manager = await User_1.default.findById(canteenManagerId);
            expect(manager).toBeNull();
        });
        test('Should reject non-existent manager', async () => {
            const fakeId = new mongoose_1.default.Types.ObjectId().toString();
            const response = await (0, supertest_1.default)(server_1.default)
                .delete(`/api/users/canteen-managers/${fakeId}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Gestionnaire de cantine non trouvé.');
        });
    });
    describe('POST /api/auth/change-temporary-password', () => {
        let canteenManagerToken;
        beforeEach(async () => {
            // Create a canteen manager with temporary password
            const manager = new User_1.default({
                first_name: 'Traoré',
                last_name: 'Moussa',
                email: 'moussa.traore@school.bf',
                password: 'TempPass2024!',
                role: 'CANTEEN_MANAGER',
                school_id: schoolId,
                is_temporary_password: true
            });
            await manager.save();
            canteenManagerId = manager._id.toString();
            // Login as canteen manager
            const loginResponse = await (0, supertest_1.default)(server_1.default)
                .post('/api/auth/login')
                .send({
                email: 'moussa.traore@school.bf',
                password: 'TempPass2024!'
            });
            canteenManagerToken = loginResponse.body.data.token;
        });
        test('Should change temporary password successfully', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/auth/change-temporary-password')
                .set('Authorization', `Bearer ${canteenManagerToken}`)
                .send({
                current_password: 'TempPass2024!',
                new_password: 'NewSecurePass123!',
                confirm_password: 'NewSecurePass123!'
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Mot de passe changé avec succès. Vous pouvez maintenant utiliser l\'application normalement.');
            // Verify password was changed
            const manager = await User_1.default.findById(canteenManagerId);
            expect(manager?.is_temporary_password).toBe(false);
            expect(manager?.password_changed_at).toBeDefined();
        });
        test('Should reject incorrect current password', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
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
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/auth/change-temporary-password')
                .set('Authorization', `Bearer ${canteenManagerToken}`)
                .send({
                current_password: 'TempPass2024!',
                new_password: 'NewSecurePass123!',
                confirm_password: 'DifferentPass123!'
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Le nouveau mot de passe et la confirmation ne correspondent pas.');
        });
        test('Should validate required fields', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/auth/change-temporary-password')
                .set('Authorization', `Bearer ${canteenManagerToken}`)
                .send({
                current_password: 'TempPass2024!',
                // Missing new_password and confirm_password
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Le mot de passe actuel, le nouveau mot de passe et la confirmation sont requis.');
        });
    });
});
