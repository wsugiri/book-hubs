// src/modules/emr/validators/emr.validator.js
import { z } from 'zod';

export const createSoapSchema = z.object({
  visitId: z.string().uuid({ message: 'Visit ID wajib format UUID' }),
  patientId: z.string().uuid({ message: 'Patient ID wajib format UUID' }),
  diagnosisCode: z.string().min(1, { message: 'Kode ICD-10 diagnosa wajib diisi' }),
  clinicalNotes: z.object({
    subjective: z.string().min(1, { message: 'Keluhan subjektif wajib diisi' }),
    objective: z.string().min(1, { message: 'Pemeriksaan objektif wajib diisi' }),
    assessment: z.string().min(1, { message: 'Assesmen klinis wajib diisi' }),
    plan: z.string().min(1, { message: 'Rencana terapi wajib diisi' })
  })
});

