// src/core/database/index.js
import { Sequelize } from 'sequelize';

// Deteksi apakah aplikasi sedang berjalan di lingkungan AWS Lambda
const isLambda = Boolean(
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.AWS_EXECUTION_ENV || 
  process.env.LAMBDA_TASK_ROOT
);

let sequelizeInstance = null;

export const getDatabase = () => {
  if (!sequelizeInstance) {
    const dbUri = process.env.DB_URI || 'postgresql://postgres:rootpassword@localhost:5432/simrs_dev';

    // Deteksi Dialek: 'postgres' atau 'mysql'
    const dialect = process.env.DB_DIALECT || (dbUri.startsWith('postgres') ? 'postgres' : 'mysql');

    // 1. Opsi Khusus Dialek (Dialect-Specific Optimizations)
    const dialectOptions = dialect === 'postgres'
      ? {
          statement_timeout: 30000, // 30s
          idle_in_transaction_session_timeout: 10000, // 10s
          application_name: 'simrs-backend-service',
          ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false
        }
      : {
          charset: 'utf8mb4',
          timezone: '+07:00',
          decimalNumbers: true, // Mencegah nilai rupiah kasir dibulatkan jadi float JS cacat
          connectTimeout: 10000
        };

    // 2. Konfigurasi Pool Adaptif (Docker vs AWS Lambda)
    const poolConfig = isLambda
      ? {
          max: 1,
          min: 0,
          idle: 1000,
          acquire: 3000,
          evict: 0
        }
      : {
          max: Number(process.env.DB_POOL_MAX) || 20,
          min: Number(process.env.DB_POOL_MIN) || 5,
          idle: 10000,
          acquire: 30000
        };

    sequelizeInstance = new Sequelize(dbUri, {
      dialect,
      dialectOptions,
      logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[SQL] ${msg}`) : false,
      pool: poolConfig
    });
  }

  return sequelizeInstance;
};

// Singleton export
export const sequelize = getDatabase();

