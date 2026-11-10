// src/modules/emr/handlers/emr.handler.js
import { sendSuccess } from '../../../core/http/response.js';
import * as emrService from '../services/emr.service.js';

export const submitSoapNotes = async (c) => {
  const payload = c.req.valid('json');
  const actor = c.get('user') || { id: 'usr-doctor-01', role: 'DOCTOR' };

  const record = await emrService.saveClinicalNotes(payload, actor);
  return sendSuccess(c, record, 'Catatan rekam medis berhasil disimpan', 201);
};

export const getRecordByVisitId = async (c) => {
  const { visitId } = c.req.param();
  const record = await emrService.getRecordByVisit(visitId);
  return sendSuccess(c, record, 'Rekam medis berhasil diambil');
};

