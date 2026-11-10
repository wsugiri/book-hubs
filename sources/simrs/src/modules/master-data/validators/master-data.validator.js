// src/modules/master-data/validators/master-data.validator.js
import { z } from 'zod';

export const getPolyclinicParamSchema = z.object({
  id: z.string().uuid({ message: 'Polyclinic ID harus valid UUID' })
});

