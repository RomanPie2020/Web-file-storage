import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly config: ConfigService) {}

  async checkDependencies() {
    const database = await this.checkDatabase();
    const storage = await this.checkStorage();
    return {
      status: database.ok && storage.ok ? 'ok' : 'degraded',
      dependencies: { database, storage },
    };
  }

  private async checkDatabase() {
    const connectionString = this.config.get<string>('DATABASE_URL');
    if (!connectionString) return { ok: false, error: 'DATABASE_URL is not configured' };
    const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000, max: 1 });
    try {
      await pool.query('select 1');
      return { ok: true };
    } catch (error) {
      this.logger.warn(
        `Database health check failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return { ok: false, error: 'Database connection failed' };
    } finally {
      await pool.end();
    }
  }

  private async checkStorage() {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET', 'data-room-pdfs');
    if (!url || !key) return { ok: false, error: 'Supabase credentials are not configured' };
    try {
      const { data: buckets, error } = await createClient(url, key).storage.listBuckets();
      if (error) throw error;
      if (!buckets?.some((item) => item.name === bucket)) {
        return { ok: false, error: `Storage bucket '${bucket}' was not found` };
      }
      return { ok: true, bucket };
    } catch (error) {
      this.logger.warn(
        `Storage health check failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return { ok: false, error: 'Storage connection failed' };
    }
  }
}
