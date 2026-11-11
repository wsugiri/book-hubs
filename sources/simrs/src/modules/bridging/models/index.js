// src/modules/bridging/models/index.js
import { defineBridgingOutboxModel } from './BridgingOutbox.js';

export const defineBridgingModels = (sequelize) => {
  const BridgingOutbox = defineBridgingOutboxModel(sequelize);
  return { BridgingOutbox };
};
