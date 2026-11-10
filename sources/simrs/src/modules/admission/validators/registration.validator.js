// src/modules/admission/validators/registration.validator.js
import { z } from 'zod';

export const createOutpatientSchema = z
  .object({
    patientId: z.string().uuid({ message: 'Format Patient ID wajib berupa UUID' }),
    polyclinicId: z.string().uuid({ message: 'Polyclinic ID wajib diisi' }),
    doctorScheduleId: z.string().uuid({ message: 'Jadwal dokter wajib dipilih' }),
    paymentType: z.enum(['BPJS', 'PRIBADI', 'ASURANSI_SWASTA'], {
      message: 'Metode pembayaran tidak valid'
    }),
    bpjsCardNumber: z.string().optional()
  })
  .refine(
    (data) => {
      if (data.paymentType === 'BPJS' && !data.bpjsCardNumber) {
        return false;
      }
      return true;
    },
    {
      message: 'Nomor Kartu BPJS wajib diisi untuk metode pembayaran BPJS',
      path: ['bpjsCardNumber']
    }
  );

