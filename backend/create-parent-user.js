const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createParentUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' Connecté à MongoDB');
    
    // Définir le schéma User si nécessaire
    const userSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, required: true, enum: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'CANTEEN_MANAGER', 'PARENT'] },
      first_name: String,
      last_name: String,
      phone: String,
      studentIds: [String], // IDs des enfants du parent
      schoolId: String,
      created_at: { type: Date, default: Date.now }
    });
    
    const User = mongoose.model('User', userSchema);
    
    // Créer un compte parent de test
    const existingParent = await User.findOne({ email: 'parent@test.bf' });
    if (!existingParent) {
      const hashedPassword = await bcrypt.hash('Parent123!', 12);
      const parent = new User({
        email: 'parent@test.bf',
        password: hashedPassword,
        role: 'PARENT',
        first_name: 'Awa',
        last_name: 'Traoré',
        phone: '+226 70 00 00 00',
        studentIds: [], // Sera rempli plus tard
        schoolId: 'school-1'
      });
      await parent.save();
      console.log(' Compte PARENT créé: parent@test.bf / Parent123!');
    } else {
      console.log(' Compte PARENT existe déjà: parent@test.bf');
    }
    
    console.log('\n Comptes disponibles pour l\'app mobile:');
    console.log('📱 PARENT: parent@test.bf / Parent123! (Recommandé pour l\'app mobile)');
    console.log('👨‍💼 SUPER_ADMIN: admin@dabali.bf / Admin123!');
    console.log('🏫 SCHOOL_ADMIN: director@ecole-test.bf / Director123!');
    console.log('🍽️ CANTEEN_MANAGER: cantine@ecole-test.bf / Cantine123!');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error(' Erreur:', error.message);
  }
}

createParentUser();
