// src/modules/master-data/routes.js
import { Hono } from 'hono';
import * as masterHandler from './handlers/master-data.handler.js';

export const masterDataRoutes = new Hono();

masterDataRoutes.get('/polyclinics', masterHandler.getPolyclinics);
masterDataRoutes.get('/polyclinics/:id', masterHandler.getPolyclinicById);

