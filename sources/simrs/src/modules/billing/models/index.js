// src/modules/billing/models/index.js
import { defineInvoiceModel } from './Invoice.js';

export const defineBillingModels = (sequelize) => {
  const Invoice = defineInvoiceModel(sequelize);
  return { Invoice };
};

