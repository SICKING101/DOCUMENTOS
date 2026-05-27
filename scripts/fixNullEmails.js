// scripts/fixNullEmails.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import User from '../src/backend/models/User.js';

const fixNullEmails = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar usuarios sin email
    const usersWithoutEmail = await User.find({
      $or: [
        { correo: null },
        { correo: { $exists: false } }
      ]
    });

    console.log(`📊 Encontrados ${usersWithoutEmail.length} usuarios sin email:\n`);

    if (usersWithoutEmail.length === 0) {
      console.log('✅ No hay usuarios para reparar');
      process.exit(0);
    }

    // Mostrar los que se van a reparar
    usersWithoutEmail.forEach(user => {
      console.log(`  • ${user.usuario || 'SIN NOMBRE'} (ID: ${user._id}) - Rol: ${user.rol}`);
    });

    console.log('\n🔧 Reparando...\n');

    // Reparar cada usuario
    for (const user of usersWithoutEmail) {
      const tempEmail = user.rol === 'superadmin'
        ? 'superadmin@gestacks.com'
        : `repaired-${user._id.toString().slice(-8)}@placeholder.local`;

      await User.updateOne(
        { _id: user._id },
        { $set: { correo: tempEmail } }
      );
      
      console.log(`✅ ${user.usuario || 'SIN NOMBRE'} → ${tempEmail}`);
    }

    console.log('\n✅ Reparación completada exitosamente');
    console.log('⚠️ Recuerda: Estos emails son temporales, actualízalos cuando sea posible');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixNullEmails();