const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Charger la config backend/.env si présente
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

// Connexion à MongoDB (fallback local si env absent)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dabali-express';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Définition minimale du modèle User (évite le build TS)
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'CANTEEN_MANAGER', 'PARENT'] },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    phone: String,
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    is_temporary_password: { type: Boolean, default: false },
    password_changed_at: { type: Date },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function createMongoAdmin() {
    console.log('🔧 Création du compte admin dans MongoDB...\n');
    
    try {
        const adminEmail = 'admin@gmail.com';
        const existing = await User.findOne({ email: adminEmail });
        if (existing) {
            console.log('ℹ️  Un compte admin existe déjà :', existing.email);
            return;
        }

        // Hasher le mot de passe
        const plainPassword = 'Admin123!';
        const hashedPassword = await bcrypt.hash(plainPassword, 12);
        
        console.log('Mot de passe en clair :', plainPassword);
        console.log('Mot de passe hashé :', hashedPassword);
        console.log('');
        
        // Créer l'utilisateur
        const adminUser = new User({
            email: adminEmail,
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            first_name: 'Super',
            last_name: 'Admin',
            phone: '+22670000000'
        });
        
        await adminUser.save();
        
        console.log('✅ Compte admin créé avec succès dans MongoDB !');
        console.log('📧 Email :', adminUser.email);
        console.log('🔑 Mot de passe :', plainPassword);
        console.log('👤 Rôle :', adminUser.role);
        console.log('📝 Nom :', `${adminUser.first_name} ${adminUser.last_name}`);
        console.log('');
        console.log('🚀 Vous pouvez maintenant vous connecter avec :');
        console.log('   Email :', adminEmail);
        console.log('   Mot de passe : Admin123!');
        
    } catch (error) {
        if (error.code === 11000) {
            console.log('ℹ️  Lutilisateur existe déjà dans MongoDB');
        } else {
            console.log('❌ Erreur :', error.message);
        }
    } finally {
        await mongoose.disconnect();
    }
}

createMongoAdmin();
