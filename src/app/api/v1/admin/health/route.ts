import { NextResponse } from 'next/server';
import { requireUser, handleRouteError, jsonError } from '@/lib/api/context';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAIConfigured } from '@/lib/ai/openai';
import { features } from '@/lib/env';

export async function GET() {
  try {
    const { supabase, user } = await requireUser();

    const { data: profile } = await supabase.from('users').select('is_platform_admin').eq('id', user.id).single();
    if (!profile?.is_platform_admin) return jsonError(403, 'Admin privileges required.');

    let dbOnline = false;
    try {
      const admin = createAdminClient();
      const { error } = await admin.from('users').select('id', { count: 'exact', head: true });
      dbOnline = !error;
    } catch {
      dbOnline = false;
    }

    const memory = process.memoryUsage();
    return NextResponse.json({
      status: dbOnline ? 'healthy' : 'degraded',
      database: dbOnline ? 'connected' : 'disconnected',
      integrations: {
        openai: isAIConfigured() ? 'configured' : 'not configured',
        razorpay: features.razorpay() ? 'configured' : 'not configured',
        resend: features.resend() ? 'configured' : 'not configured',
        encryption: features.encryption() ? 'configured' : 'not configured',
      },
      system: {
        node_version: process.version,
        uptime_seconds: Math.round(process.uptime()),
        heap_used_mb: Math.round(memory.heapUsed / 1024 / 1024),
        rss_mb: Math.round(memory.rss / 1024 / 1024),
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
