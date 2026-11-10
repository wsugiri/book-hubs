// src/modules/master-data/handlers/master-data.handler.js
import { sendSuccess } from '../../../core/http/response.js';
import * as masterService from '../services/master-data.service.js';

export const getPolyclinics = async (c) => {
  const polyclinics = await masterService.getAllPolyclinics();
  return sendSuccess(c, polyclinics, 'Data poliklinik berhasil diambil');
};

export const getPolyclinicById = async (c) => {
  const { id } = c.req.param();
  const polyclinic = await masterService.getPolyclinicDetail(id);
  return sendSuccess(c, polyclinic, 'Detail poliklinik berhasil diambil');
};

