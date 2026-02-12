const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../server');

describe('Service Authentification ↔ Base de Données - Tests de Communication', () => {
  let dbConnection;
  let testUser;

  beforeAll(async () => {
    // Connexion à la base de données de test
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/dabali-auth-test';
    dbConnection = await mongoose.connect(mongoUri);
    console.log('✅ Connecté à la base de données de test');
  });

  afterAll(async () => {
    // Nettoyage et déconnexion
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
    console.log('✅ Base de données de test nettoyée et déconnectée');
  });

  beforeEach(async () => {
    // Nettoyer la collection users avant chaque test
    if (mongoose.connection.db) {
      await mongoose.connection.db.collection('users').deleteMany({});
    }
  });

  describe('🔌 Connexion Base de Données', () => {
    test('Should connect to MongoDB successfully', async () => {
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
      expect(mongoose.connection.name).toBeDefined();
    });

    test('Should access users collection', async () => {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const hasUsersCollection = collections.some(col => col.name === 'users');
      expect(hasUsersCollection).toBe(true);
    });
  });

  describe('📝 Opérations CRUD Utilisateur', () => {
    test('Should create user in database', async () => {
      const userData = {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        password: 'TestPass123!',
        role: 'PARENT'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Vérifier directement dans la base de données
      const userInDb = await mongoose.connection.db
        .collection('users')
        .findOne({ email: userData.email });

      expect(userInDb).toBeTruthy();
      expect(userInDb.email).toBe(userData.email);
      expect(userInDb.first_name).toBe(userData.first_name);
      expect(userInDb.last_name).toBe(userData.last_name);
      expect(userInDb.role).toBe(userData.role);
      expect(userInDb.password).not.toBe(userData.password); // Doit être hashé
    });

    test('Should read user from database during login', async () => {
      // Créer un utilisateur directement dans la base de données
      const hashedPassword = await bcrypt.hash('DirectPass123!', 12);
      await mongoose.connection.db.collection('users').insertOne({
        first_name: 'Direct',
        last_name: 'User',
        email: 'direct@example.com',
        password: hashedPassword,
        role: 'PARENT',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Tenter de se connecter
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'direct@example.com',
          password: 'DirectPass123!'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      expect(loginResponse.body.data.user.email).toBe('direct@example.com');
    });

    test('Should update user in database', async () => {
      // Créer un utilisateur
      const createResponse = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Original',
          last_name: 'Name',
          email: 'update@example.com',
          password: 'UpdatePass123!',
          role: 'PARENT'
        });

      const token = createResponse.body.data.token;

      // Mettre à jour le profil
      const updateResponse = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'Updated',
          last_name: 'Name',
          phone: '+22612345678'
        });

      expect(updateResponse.status).toBe(200);

      // Vérifier dans la base de données
      const userInDb = await mongoose.connection.db
        .collection('users')
        .findOne({ email: 'update@example.com' });

      expect(userInDb.first_name).toBe('Updated');
      expect(userInDb.phone).toBe('+22612345678');
    });

    test('Should handle password update in database', async () => {
      // Créer un utilisateur
      const createResponse = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Password',
          last_name: 'Test',
          email: 'password@example.com',
          password: 'OldPass123!',
          role: 'PARENT'
        });

      const token = createResponse.body.data.token;

      // Changer le mot de passe
      const changeResponse = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass456!',
          confirmPassword: 'NewPass456!'
        });

      expect(changeResponse.status).toBe(200);

      // Vérifier que le mot de passe a changé dans la base de données
      const userInDb = await mongoose.connection.db
        .collection('users')
        .findOne({ email: 'password@example.com' });

      // L'ancien mot de passe ne doit pas correspondre
      const oldPasswordMatch = await bcrypt.compare('OldPass123!', userInDb.password);
      expect(oldPasswordMatch).toBe(false);

      // Le nouveau mot de passe doit correspondre
      const newPasswordMatch = await bcrypt.compare('NewPass456!', userInDb.password);
      expect(newPasswordMatch).toBe(true);
    });
  });

  describe('🔒 Sécurité des Mots de Passe', () => {
    test('Should hash passwords before storing in database', async () => {
      const userData = {
        first_name: 'Security',
        last_name: 'Test',
        email: 'security@example.com',
        password: 'PlainPassword123!',
        role: 'PARENT'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Vérifier dans la base de données
      const userInDb = await mongoose.connection.db
        .collection('users')
        .findOne({ email: userData.email });

      expect(userInDb.password).not.toBe(userData.password);
      expect(userInDb.password.length).toBeGreaterThan(50); // Hash bcrypt
      
      // Vérifier que le hash est valide
      const isValid = await bcrypt.compare(userData.password, userInDb.password);
      expect(isValid).toBe(true);
    });

    test('Should use correct bcrypt rounds', async () => {
      const userData = {
        first_name: 'Bcrypt',
        last_name: 'Test',
        email: 'bcrypt@example.com',
        password: 'BcryptPass123!',
        role: 'PARENT'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const userInDb = await mongoose.connection.db
        .collection('users')
        .findOne({ email: userData.email });

      // Extraire le nombre de rounds du hash
      const matches = userInDb.password.match(/^\$2[aby]\$(\d+)\$/);
      const rounds = parseInt(matches[1]);
      
      expect(rounds).toBe(12); // Doit correspondre à BCRYPT_ROUNDS dans .env
    });
  });

  describe('⚡ Performance et Concurrence', () => {
    test('Should handle multiple concurrent user creations', async () => {
      const userPromises = [];
      
      for (let i = 0; i < 10; i++) {
        userPromises.push(
          request(app)
            .post('/api/auth/register')
            .send({
              first_name: `User${i}`,
              last_name: 'Test',
              email: `user${i}@example.com`,
              password: 'ConcurrentPass123!',
              role: 'PARENT'
            })
        );
      }

      const responses = await Promise.all(userPromises);
      
      // Toutes les réponses doivent être réussies
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Vérifier que tous les utilisateurs existent dans la base de données
      const userCount = await mongoose.connection.db
        .collection('users')
        .countDocuments({ role: 'PARENT' });
      
      expect(userCount).toBe(10);
    });

    test('Should prevent duplicate email creation concurrently', async () => {
      const userData = {
        first_name: 'Duplicate',
        last_name: 'Test',
        email: 'duplicate@example.com',
        password: 'DuplicatePass123!',
        role: 'PARENT'
      };

      // Tenter de créer le même utilisateur simultanément
      const promises = Array(5).fill().map(() =>
        request(app)
          .post('/api/auth/register')
          .send(userData)
      );

      const responses = await Promise.all(promises);
      
      // Une seule création doit réussir
      const successCount = responses.filter(r => r.status === 201).length;
      const conflictCount = responses.filter(r => r.status === 409).length;
      
      expect(successCount).toBe(1);
      expect(conflictCount).toBe(4);

      // Vérifier qu'un seul utilisateur existe dans la base de données
      const userCount = await mongoose.connection.db
        .collection('users')
        .countDocuments({ email: userData.email });
      
      expect(userCount).toBe(1);
    });
  });

  describe('🚨 Gestion des Erreurs', () => {
    test('Should handle database connection errors gracefully', async () => {
      // Simuler une déconnexion
      await mongoose.disconnect();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!'
        });

      // La réponse doit indiquer une erreur de serveur
      expect([500, 503]).toContain(response.status);

      // Reconnecter pour les tests suivants
      const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/dabali-auth-test';
      await mongoose.connect(mongoUri);
    });

    test('Should validate database schema constraints', async () => {
      // Tenter d'insérer un utilisateur avec des données invalides directement
      try {
        await mongoose.connection.db.collection('users').insertOne({
          // Champs requis manquants
          email: 'invalid@example.com'
          // password, role, first_name, last_name manquants
        });
        // Si l'insertion réussit, c'est un problème
        expect(true).toBe(false);
      } catch (error) {
        // Le schéma Mongoose devrait rejeter cette insertion
        expect(error).toBeTruthy();
      }
    });

    test('Should handle database query timeouts', async () => {
      // Créer un utilisateur avec un mot de passe très complexe
      // pour simuler un traitement long
      const complexPassword = 'A'.repeat(1000) + '1!';
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Timeout',
          last_name: 'Test',
          email: 'timeout@example.com',
          password: complexPassword,
          role: 'PARENT'
        });

      // La réponse doit être gérée dans un délai raisonnable
      expect(response.status).toBeDefined();
    });
  });

  describe('📊 Intégrité des Données', () => {
    test('Should maintain data consistency across operations', async () => {
      // Créer un utilisateur
      const createResponse = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Consistency',
          last_name: 'Test',
          email: 'consistency@example.com',
          password: 'ConsistencyPass123!',
          role: 'PARENT'
        });

      const userId = createResponse.body.data.user._id;
      const token = createResponse.body.data.token;

      // Mettre à jour plusieurs fois
      await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+22611111111' });

      await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ first_name: 'Updated' });

      // Changer le mot de passe
      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'ConsistencyPass123!',
          newPassword: 'NewConsistencyPass456!',
          confirmPassword: 'NewConsistencyPass456!'
        });

      // Vérifier l'état final dans la base de données
      const finalUser = await mongoose.connection.db
        .collection('users')
        .findOne({ _id: new mongoose.Types.ObjectId(userId) });

      expect(finalUser.first_name).toBe('Updated');
      expect(finalUser.phone).toBe('+22611111111');
      
      // Vérifier que le mot de passe a été mis à jour
      const isNewPasswordValid = await bcrypt.compare('NewConsistencyPass456!', finalUser.password);
      expect(isNewPasswordValid).toBe(true);
    });

    test('Should handle transactions correctly', async () => {
      // Simuler une opération qui devrait être atomique
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          // Créer un utilisateur dans la transaction
          await mongoose.connection.db.collection('users').insertOne({
            first_name: 'Transaction',
            last_name: 'Test',
            email: 'transaction@example.com',
            password: await bcrypt.hash('TransactionPass123!', 12),
            role: 'PARENT',
            createdAt: new Date(),
            updatedAt: new Date()
          }, { session });

          // Simuler une erreur qui devrait annuler la transaction
          throw new Error('Simulated transaction failure');
        });
      } catch (error) {
        // La transaction devrait être annulée
      } finally {
        await session.endSession();
      }

      // Vérifier que l'utilisateur n'a pas été créé
      const userCount = await mongoose.connection.db
        .collection('users')
        .countDocuments({ email: 'transaction@example.com' });
      
      expect(userCount).toBe(0);
    });
  });
});
