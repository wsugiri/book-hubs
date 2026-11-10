// src/modules/pharmacy/validators/pharmacy.validator.js
import { z } from 'zod';

export const createPrescriptionSchema = z.object({
  visitId: z.string().uuid({ message: 'Visit ID wajib format UUID' }),
  patientId: z.string().uuid({ message: 'Patient ID wajib format UUID' }),
  medicines: z.array(
    z.object({
      medicineId: z.string(),
      medicineName: z.string().min(1),
      qty: z.number().positive(),
      dosage: z.string(),
      signa: z.string()
    })
  ).min(1, { message: 'Minimal harus ada 1 obat di dalam resep' })
});

