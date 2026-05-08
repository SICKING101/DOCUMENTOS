// src/backend/config/env.js
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ir a la raíz del proyecto (3 niveles arriba desde config/)
const rootPath = path.resolve(__dirname, '../../../');
const envPath = path.join(rootPath, '.env');

console.log('🔍 Buscando .env en:', envPath);

if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        console.error('❌ Error cargando .env:', result.error);
    } else {
        console.log('✅ .env cargado correctamente');
    }
} else {
    console.warn('⚠️ Archivo .env no encontrado en:', envPath);
}

console.log('🔑 BREVO_API_KEY cargada:', process.env.BREVO_API_KEY ? '✅ SÍ' : '❌ NO');

export default process.env;