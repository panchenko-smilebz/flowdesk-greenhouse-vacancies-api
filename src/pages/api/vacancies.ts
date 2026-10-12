import type { APIRoute } from 'astro';
import { DEFAULT_API_BASE, DEFAULT_BOARD_TOKEN, fetchVacancies } from '../../lib/greenhouse';

export const prerender = false;

// Seconds the response may be cached by the browser / Webflow edge.
const CACHE_SECONDS = 300;

function readEnv(locals: unknown, key: string): string | undefined {
  try {
    // Webflow Cloud exposes runtime variables on locals.runtime.env
    const value = (locals as { runtime?: { env?: Record<string, unknown> } })?.runtime?.env?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  } catch {
    // locals.runtime may be unavailable depending on the adapter version
  }
  const fromBuild = (import.meta.env as Record<string, unknown>)[key];
  return typeof fromBuild === 'string' && fromBuild.trim() ? fromBuild.trim() : undefined;
}

export const GET: APIRoute = async ({ locals }) => {
  const boardToken = readEnv(locals, 'GREENHOUSE_BOARD_TOKEN') ?? DEFAULT_BOARD_TOKEN;
  const apiBase = readEnv(locals, 'GREENHOUSE_API_BASE') ?? DEFAULT_API_BASE;

  try {
    const jobs = await fetchVacancies(boardToken, apiBase);

    return new Response(JSON.stringify({ jobs, meta: { total: jobs.length, source: 'greenhouse' } }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    console.error('Greenhouse vacancies error:', error);

    return new Response(JSON.stringify({ jobs: [], error: 'Failed to load vacancies' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
};
