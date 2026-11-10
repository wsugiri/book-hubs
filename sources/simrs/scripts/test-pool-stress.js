import { Sequelize } from 'sequelize';

const DB_URI = process.env.DB_URI || 'mysql://root:rootpassword@localhost:3306/simrs_dev';

console.info('⚡ Memulai simulasi 60 eksekusi konkuren fungsi Lambda tanpa adaptive pool...');

const simulateLambdaInvocations = async () => {
  const tasks = Array.from({ length: 60 }).map(async (_, idx) => {
    // Simulasi inisialisasi salah: membuka pool default max 5 per instance
    const naiveInstance = new Sequelize(DB_URI, {
      logging: false,
      pool: { max: 5, min: 1, acquire: 3000 }
    });

    try {
      await naiveInstance.authenticate();
      // Simulasi query kasir / pendaftaran yang memakan waktu 500ms
      await naiveInstance.query('SELECT 1;');
      return { id: idx, status: 'SUCCESS' };
    } catch (err) {
      return { id: idx, status: 'FAILED', error: err.name };
    } finally {
      await naiveInstance.close().catch(() => {});
    }
  });

  const results = await Promise.all(tasks);
  const failed = results.filter((r) => r.status === 'FAILED');
  console.table({
    TotalRequests: results.length,
    Sukses: results.length - failed.length,
    Gagal: failed.length,
    SampleError: failed[0]?.error || 'None'
  });
};

simulateLambdaInvocations();

