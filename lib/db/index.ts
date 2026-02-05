import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// ===========================================
// Database Connection Pool
// ===========================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection errors
pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err);
});

// ===========================================
// Query Functions
// ===========================================

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('[DB] Query:', { text: text.slice(0, 100), duration, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('[DB] Query error:', { text: text.slice(0, 100), error });
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// ===========================================
// Transaction Helper
// ===========================================

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ===========================================
// Health Check
// ===========================================

export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// ===========================================
// Graceful Shutdown
// ===========================================

export async function closePool(): Promise<void> {
  await pool.end();
}

export { pool };
