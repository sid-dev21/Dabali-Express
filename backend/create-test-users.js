const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' Connecté à MongoDB');
    
    const userSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, required: true, enum: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'CANTEEN_MANAGER'] },
      first_name: String,
      last_name: String,
      schoolId: String,
      schoolName: String,
      created_at: { type: Date, default: Date.now }
    });
    
    const User = mongoose.model('User', userSchema);
    
    // Compte SCHOOL_ADMIN
    const existingDirector = await User.findOne({ email: 'director@ecole-test.bf' });
    if (!existingDirector) {
      const hashedDirectorPassword = await bcrypt.hash('Director123!', 12);
      const director = new User({
        email: 'director@ecole-test.bf',
        password: hashedDirectorPassword,
        role: 'SCHOOL_ADMIN',
        first_name: 'Jean',
        last_name: 'Kaboré',
        schoolId: 'school-1',
        schoolName: 'Lycée Test'
      });
      await director.save();
      console.log('Compte SCHOOL_ADMIN créé: director@ecole-test.bf / Director123!');
    } else {
      console.log(' Compte SCHOOL_ADMIN existe déjà: director@ecole-test.bf');
    }
    
    // Compte CANTEEN_MANAGER
    const existingCantine = await User.findOne({ email: 'cantine@ecole-test.bf' });
    if (!existingCantine) {
      const hashedCantinePassword = await bcrypt.hash('Cantine123!', 12);
      const cantine = new User({
        email: 'cantine@ecole-test.bf',
        password: hashedCantinePassword,
        role: 'CANTEEN_MANAGER',
        first_name: 'Aminata',
        last_name: 'Sawadogo',
        schoolId: 'school-1',
        schoolName: 'Lycée Test'
      });
      await cantine.save();
      console.log('Compte CANTEEN_MANAGER créé: cantine@ecole-test.bf / Cantine123!');
    } else {
      console.log(' Compte CANTEEN_MANAGER existe déjà: cantine@ecole-test.bf');
    }
    
    console.log('\n Comptes de test disponibles:');
    console.log('1. SUPER_ADMIN: admin@dabali.bf / Admin123!');
    console.log('2. SCHOOL_ADMIN: director@ecole-test.bf / Director123!');
    console.log('3. CANTEEN_MANAGER: cantine@ecole-test.bf / Cantine123!');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error(' Erreur:', error.message);
  }
}

createTestUsers();
