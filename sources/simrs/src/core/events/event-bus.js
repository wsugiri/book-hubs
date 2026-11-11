// src/core/events/event-bus.js
// Factory function murni (Functional & Zero-Class)
import { logger } from '../config/logger.js';

export const createEventBus = () => {
  const handlers = new Map();

  /**
   * Publikasikan domain event ke seluruh subscriber terdaftar.
   * Mendukung penerusan options (seperti { transaction }) secara langsung dari objek event.
   *
   * @param {object} event - Objek domain event { eventName, occurredAt, payload }
   * @param {object} [options] - Konteks eksekusi opsional (misal: { transaction })
   */
  const publish = async (event, options = {}) => {
    if (!event?.eventName) return;

    const { eventName, payload } = event;
    logger.debug({ eventName, payload }, '[EVENT BUS] Menerbitkan domain event');

    const subscribers = handlers.get(eventName) || [];
    for (const handler of subscribers) {
      try {
        await handler(event, options);
      } catch (err) {
        logger.error({ err, eventName }, `[EVENT BUS ERROR] Subscriber gagal memproses event ${eventName}`);
        // Jika berjalan di dalam transaksi database aktif, lempar kembali agar transaksi rollback secara utuh
        if (options.transaction) throw err;
      }
    }
  };

  /**
   * Daftarkan subscriber untuk domain event tertentu
   * @param {string} eventName - Nama event (contoh: 'admission.visit.registered')
   * @param {Function} handler - Fungsi async (event, options) => Promise<void>
   */
  const subscribe = (eventName, handler) => {
    if (!handlers.has(eventName)) {
      handlers.set(eventName, []);
    }
    handlers.get(eventName).push(handler);
  };

  const clear = () => {
    handlers.clear();
  };

  return {
    publish,
    subscribe,
    clear
  };
};

export const noopEventBus = Object.freeze({
  publish: async () => { },
  subscribe: () => { },
  clear: () => { }
});

// Singleton In-Process Domain Event Bus
export const eventBus = createEventBus();
