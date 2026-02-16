const mongoose = require('mongoose');

async function debugUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/dabali-express');
    console.log(' Connecté à MongoDB');
    
    const userSchema = new mongoose.Schema({
      email: String,
      password: String,
      role: String,
      first_name: String,
      last_name: String
    });
    
    const User = mongoose.model('User', userSchema);
    
    const admin = await User.findOne({ email: 'admin@dabali.bf' });
    
    if (admin) {
      console.log(' Utilisateur trouvé:');
      console.log('  Email:', admin.email);
      console.log('  Rôle:', admin.role);
      console.log('  Nom:', admin.first_name, admin.last_name);
    } else {
      console.log('Aucun utilisateur admin trouvé');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error(' Erreur:', error.message);
  }
}

debugUser();
