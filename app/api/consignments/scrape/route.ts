import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import path from 'path';
import { supabase } from '@/lib/supabaseClient';

// Simple in-memory job tracker (reset on server restart).
interface JobInfo {
  status: 'queued' | 'running' | 'finished' | 'error';
  startedAt: number;
  endedAt?: number;
  output: string;
}
const jobs = new Map<string, JobInfo>();

export async function POST(req: Request) {
  const { url, max } = await req.json();
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const id = randomUUID();

  // Insert job row
  await supabase.from('scrape_jobs').insert({ id, status: 'queued' });

  // Resolve absolute path to the scraper entry
  const scraperPath = path.join(process.cwd(), 'lib', 'scraper', 'scrape.ts');

  // Spawn a detached child process using tsx so we can run TypeScript directly
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsx', scraperPath, url, String(max ?? 20)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env, JOB_ID: id },
  });

  // Update job to running
  await supabase.from('scrape_jobs').update({ status: 'running', started_at: new Date() }).eq('id', id);

  child.stdout.on('data', async (data) => {
    const chunk = data.toString();
    await supabase.rpc('append_job_log', { p_job_id: id, p_chunk: chunk });
  });
  child.stderr.on('data', async (data) => {
    const chunk = data.toString();
    await supabase.rpc('append_job_log', { p_job_id: id, p_chunk: chunk });
  });
  child.on('exit', async (code) => {
    await supabase.from('scrape_jobs').update({ status: code===0?'finished':'error', finished_at: new Date() }).eq('id', id);
  });

  // Detach so it continues even if this request scope ends
  child.unref();

  return NextResponse.json({ jobId: id }, { status: 202 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  const { data } = await supabase.from('scrape_jobs').select('*').eq('id', id).single();
  if (!data) return NextResponse.json({ error: 'job not found' }, { status: 404 });
  return NextResponse.json(data);
} 