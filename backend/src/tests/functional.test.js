const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Configuration de l'environnement de test fonctionnel
require('dotenv').config({ path: '.env.test' });

// Import de l'application réelle
const app = require('../server');

describe('🎭 Tests Fonctionnels - Workflows Utilisateur Complets', () => {
  let superAdminToken, schoolAdminToken, parentToken, canteenManagerToken;
  let schoolId, studentId, menuId, subscriptionId;

  beforeAll(async () => {
    // Connexion à la base de données de test
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/dabali-functional-test';
    await mongoose.connect(mongoUri);
    console.log('🔌 Base de données de test fonctionnelle connectée');
  });

  afterAll(async () => {
    // Nettoyage complet
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
    console.log('🧹 Base de données nettoyée');
  });

  beforeEach(async () => {
    // Nettoyage entre les tests
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
  });

  describe('🚀 Scénario 1: Configuration Initiale du Système', () => {
    test('Workflow complet: Super Admin → School Admin → École → Gestionnaire', async () => {
      // Étape 1: Création du Super Admin
      const superAdminResponse = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Super',
          last_name: 'Admin',
          email: 'superadmin@dabali.bf',
          password: 'Admin123!',
          role: 'SUPER_ADMIN'
        });

      expect(superAdminResponse.status).toBe(201);
      expect(superAdminResponse.body.success).toBe(true);
      superAdminToken = superAdminResponse.body.data.token;

      // Étape 2: Connexion du Super Admin
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'superadmin@dabali.bf',
          password: 'Admin123!'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data.user.role).toBe('SUPER_ADMIN');

      // Étape 3: Création d'une école
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'École Primaire Test',
          address: '123 Rue Test',
          city: 'Ouagadougou',
          adminName: 'Directeur Test',
          studentCount: 200,
          status: 'active'
        });

      expect(schoolResponse.status).toBe(201);
      expect(schoolResponse.body.success).toBe(true);
      schoolId = schoolResponse.body.data._id;

      // Étape 4: Création du School Admin
      const schoolAdminResponse = await request(app)
        .post('/api/users/school-admins')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          first_name: 'Directeur',
          last_name: 'École',
          email: 'director@ecole-test.bf',
          password: 'SchoolAdmin123!',
          phone: '+22670123456',
          school_id: schoolId
        });

      expect(schoolAdminResponse.status).toBe(201);
      expect(schoolAdminResponse.body.success).toBe(true);
      schoolAdminToken = schoolAdminResponse.body.data.token;

      // Étape 5: Connexion du School Admin
      const schoolAdminLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'director@ecole-test.bf',
          password: 'SchoolAdmin123!'
        });

      expect(schoolAdminLogin.status).toBe(200);
      expect(schoolAdminLogin.body.data.user.role).toBe('SCHOOL_ADMIN');

      // Étape 6: Création du Gestionnaire de Cantine
      const canteenManagerResponse = await request(app)
        .post('/api/users/canteen-managers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          first_name: 'Gestionnaire',
          last_name: 'Cantine',
          email: 'cantine@ecole-test.bf',
          password: 'Cantine123!',
          phone: '+22670789012',
          school_id: schoolId
        });

      expect(canteenManagerResponse.status).toBe(201);
      expect(canteenManagerResponse.body.success).toBe(true);
      canteenManagerToken = canteenManagerResponse.body.data.token;

      console.log('✅ Scénario 1: Configuration initiale réussie');
    });
  });

  describe('👨‍👩‍👧‍👦 Scénario 2: Workflow Parent Complet', () => {
    beforeEach(async () => {
      // Préparer l'environnement pour chaque test
      await setupSchoolEnvironment();
    });

    test('Workflow: Inscription Parent → Ajout Enfant → Abonnement → Paiement', async () => {
      // Étape 1: Inscription du Parent
      const parentResponse = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Awa',
          last_name: 'Traoré',
          email: 'awa.traore@gmail.com',
          password: 'Parent123!',
          role: 'PARENT'
        });

      expect(parentResponse.status).toBe(201);
      parentToken = parentResponse.body.data.token;

      // Étape 2: Connexion du Parent
      const parentLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.traore@gmail.com',
          password: 'Parent123!'
        });

      expect(parentLogin.status).toBe(200);
      expect(parentLogin.body.data.user.role).toBe('PARENT');

      // Étape 3: Ajout d'un étudiant
      const studentResponse = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          first_name: 'Mohamed',
          last_name: 'Traoré',
          class: 'CM2',
          birth_date: '2015-03-15',
          parent_id: parentResponse.body.data._id
        });

      expect(studentResponse.status).toBe(201);
      expect(studentResponse.body.success).toBe(true);
      studentId = studentResponse.body.data._id;

      // Étape 4: Création d'un menu par le gestionnaire
      const menuResponse = await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          name: 'Menu Équilibré',
          description: 'Repas équilibré pour enfants',
          price: 500,
          meals: ['Riz', 'Sauce', 'Légumes', 'Fruit'],
          date: '2024-02-15',
          school_id: schoolId
        });

      expect(menuResponse.status).toBe(201);
      menuId = menuResponse.body.data._id;

      // Étape 5: Création d'une abonnement
      const subscriptionResponse = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          student_id: studentId,
          start_date: '2024-02-01',
          end_date: '2024-02-29',
          meal_plan: 'MENSUEL',
          price: 10000
        });

      expect(subscriptionResponse.status).toBe(201);
      subscriptionId = subscriptionResponse.body.data._id;

      // Étape 6: Paiement de l'abonnement
      const paymentResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          subscription_id: subscriptionId,
          amount: 10000,
          method: 'MOBILE_MONEY',
          reference: 'REF-' + Date.now()
        });

      expect(paymentResponse.status).toBe(201);
      expect(paymentResponse.body.success).toBe(true);

      console.log('✅ Scénario 2: Workflow Parent complet réussi');
    });
  });

  describe('🍽️ Scénario 3: Gestion de Cantine Quotidienne', () => {
    beforeEach(async () => {
      await setupCompleteEnvironment();
    });

    test('Workflow: Création Menu → Pointage Présence → Génération Rapport', async () => {
      // Étape 1: Création du menu du jour
      const dailyMenuResponse = await request(app)
        .post('/api/menus')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          name: 'Menu du Lundi',
          description: 'Repas du lundi',
          price: 500,
          meals: ['Tô', 'Sauce gombo', 'Viande'],
          date: new Date().toISOString().split('T')[0],
          school_id: schoolId
        });

      expect(dailyMenuResponse.status).toBe(201);
      const dailyMenuId = dailyMenuResponse.body.data._id;

      // Étape 2: Pointage présence des étudiants
      const attendanceResponse = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${canteenManagerToken}`)
        .send({
          student_id: studentId,
          menu_id: dailyMenuId,
          date: new Date().toISOString().split('T')[0],
          status: 'PRESENT',
          marked_by: canteenManagerToken
        });

      expect(attendanceResponse.status).toBe(201);
      expect(attendanceResponse.body.success).toBe(true);

      // Étape 3: Génération du rapport quotidien
      const reportResponse = await request(app)
        .get(`/api/reports/daily?date=${new Date().toISOString().split('T')[0]}`)
        .set('Authorization', `Bearer ${canteenManagerToken}`);

      expect(reportResponse.status).toBe(200);
      expect(reportResponse.body.success).toBe(true);
      expect(reportResponse.body.data.total_students).toBeGreaterThan(0);

      console.log('✅ Scénario 3: Gestion cantine quotidienne réussie');
    });
  });

  describe('💰 Scénario 4: Gestion des Paiements et Rapports', () => {
    beforeEach(async () => {
      await setupCompleteEnvironment();
    });

    test('Workflow: Paiement Multiple → Validation → Rapport Financier', async () => {
      // Étape 1: Création de plusieurs abonnements
      const subscriptions = [];
      for (let i = 0; i < 3; i++) {
        const subResponse = await request(app)
          .post('/api/subscriptions')
          .set('Authorization', `Bearer ${parentToken}`)
          .send({
            student_id: studentId,
            start_date: '2024-02-01',
            end_date: '2024-04-30',
            meal_plan: 'TRIMESTRIEL',
            price: 30000
          });
        subscriptions.push(subResponse.body.data._id);
      }

      // Étape 2: Paiements multiples
      const payments = [];
      for (const subId of subscriptions) {
        const paymentResponse = await request(app)
          .post('/api/payments')
          .set('Authorization', `Bearer ${parentToken}`)
          .send({
            subscription_id: subId,
            amount: 30000,
            method: 'MOBILE_MONEY',
            reference: `REF-${Date.now()}-${Math.random()}`
          });
        payments.push(paymentResponse.body.data);
      }

      // Étape 3: Validation des paiements
      for (const payment of payments) {
        const validateResponse = await request(app)
          .put(`/api/payments/${payment._id}/validate`)
          .set('Authorization', `Bearer ${schoolAdminToken}`);

        expect(validateResponse.status).toBe(200);
        expect(validateResponse.body.data.status).toBe('VALIDATED');
      }

      // Étape 4: Génération rapport financier
      const financialReport = await request(app)
        .get('/api/reports/financial?start_date=2024-02-01&end_date=2024-04-30')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(financialReport.status).toBe(200);
      expect(financialReport.body.success).toBe(true);
      expect(financialReport.body.data.total_revenue).toBe(90000);

      console.log('✅ Scénario 4: Gestion paiements et rapports réussie');
    });
  });

  describe('🔒 Scénario 5: Sécurité et Permissions', () => {
    test('Workflow: Validation des permissions par rôle', async () => {
      await setupSchoolEnvironment();

      // Test permissions PARENT
      const parentUnauthorizedActions = [
        { method: 'post', url: '/api/schools', data: { name: 'Test' } },
        { method: 'post', url: '/api/users/school-admins', data: { email: 'test@test.com' } },
        { method: 'post', url: '/api/users/canteen-managers', data: { email: 'test@test.com' } }
      ];

      for (const action of parentUnauthorizedActions) {
        const response = await request(app)
          [action.method](action.url)
          .set('Authorization', `Bearer ${parentToken}`)
          .send(action.data);

        expect(response.status).toBe(403);
      }

      // Test permissions CANTEEN_MANAGER
      const canteenUnauthorizedActions = [
        { method: 'post', url: '/api/schools', data: { name: 'Test' } },
        { method: 'delete', url: `/api/schools/${schoolId}` }
      ];

      for (const action of canteenUnauthorizedActions) {
        const response = await request(app)
          [action.method](action.url)
          .set('Authorization', `Bearer ${canteenManagerToken}`)
          .send(action.data);

        expect([403, 405]).toContain(response.status);
      }

      console.log('✅ Scénario 5: Sécurité et permissions validées');
    });
  });

  // Fonctions utilitaires pour préparer l'environnement
  async function setupSchoolEnvironment() {
    // Créer Super Admin et école
    const superAdmin = await request(app)
      .post('/api/auth/register')
      .send({
        first_name: 'Super',
        last_name: 'Admin',
        email: 'superadmin@test.bf',
        password: 'Admin123!',
        role: 'SUPER_ADMIN'
      });

    superAdminToken = superAdmin.body.data.token;

    const school = await request(app)
      .post('/api/schools')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'École Test Fonctionnel',
        address: '456 Rue Test',
        city: 'Bobo-Dioulasso',
        adminName: 'Directeur Test',
        studentCount: 150,
        status: 'active'
      });

    schoolId = school.body.data._id;

    // Créer School Admin
    const schoolAdmin = await request(app)
      .post('/api/users/school-admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        first_name: 'Directeur',
        last_name: 'Test',
        email: 'director@test.bf',
        password: 'SchoolAdmin123!',
        phone: '+22670123456',
        school_id: schoolId
      });

    schoolAdminToken = schoolAdmin.body.data.token;

    // Créer Canteen Manager
    const canteenManager = await request(app)
      .post('/api/users/canteen-managers')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        first_name: 'Cantine',
        last_name: 'Manager',
        email: 'cantine@test.bf',
        password: 'Cantine123!',
        phone: '+22670789012',
        school_id: schoolId
      });

    canteenManagerToken = canteenManager.body.data.token;

    // Créer Parent
    const parent = await request(app)
      .post('/api/auth/register')
      .send({
        first_name: 'Parent',
        last_name: 'Test',
        email: 'parent@test.bf',
        password: 'Parent123!',
        role: 'PARENT'
      });

    parentToken = parent.body.data.token;
  }

  async function setupCompleteEnvironment() {
    await setupSchoolEnvironment();

    // Créer étudiant
    const student = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        first_name: 'Étudiant',
        last_name: 'Test',
        class: 'CM1',
        birth_date: '2014-05-20'
      });

    studentId = student.body.data._id;
  }
});
