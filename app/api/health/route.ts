import { NextResponse } from 'next/server';
import { query, healthCheck as dbHealthCheck } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: 'up' | 'down';
    redis?: 'up' | 'down';
  };
  uptime: number;
}

const startTime = Date.now();

export async function GET() {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'down',
    },
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  // Check database
  try {
    const dbOk = await dbHealthCheck();
    health.services.database = dbOk ? 'up' : 'down';
  } catch {
    health.services.database = 'down';
  }

  // Check Redis (optional)
  if (process.env.REDIS_URL) {
    try {
      // Simple Redis check would go here
      // For now, assume up if configured
      health.services.redis = 'up';
    } catch {
      health.services.redis = 'down';
    }
  }

  // Determine overall status
  if (health.services.database === 'down') {
    health.status = 'unhealthy';
    return NextResponse.json(health, { status: 503 });
  }

  if (health.services.redis === 'down') {
    health.status = 'degraded';
  }

  return NextResponse.json(health, { status: 200 });
}
