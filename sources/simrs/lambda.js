import { handle } from 'hono/aws-lambda';
import app from './src/app.js';
import { sequelize } from './src/core/database/index.js';

const honoHandler = handle(app);

export const handler = async (event, context) => {
  // Pola rekomendasi Sequelize untuk serverless AWS Lambda
  if (sequelize.connectionManager.initPools) {
    sequelize.connectionManager.initPools();
  }
  if (Object.prototype.hasOwnProperty.call(sequelize.connectionManager, 'getConnection')) {
    delete sequelize.connectionManager.getConnection;
  }

  try {
    return await honoHandler(event, context);
  } finally {
    if (sequelize.connectionManager.close) {
      await sequelize.connectionManager.close();
    }
  }
};

