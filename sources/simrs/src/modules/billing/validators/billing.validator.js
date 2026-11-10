// src/modules/billing/validators/billing.validator.js
import { z } from 'zod';

export const getInvoiceParamSchema = z.object({
  visitId: z.string().uuid({ message: 'Visit ID harus format UUID' })
});

