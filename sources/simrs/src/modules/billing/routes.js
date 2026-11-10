// src/modules/billing/routes.js
import { Hono } from 'hono';
import * as billingHandler from './handlers/billing.handler.js';

export const billingRoutes = new Hono();

billingRoutes.get('/invoices/visit/:visitId', billingHandler.getInvoiceByVisitId);

