import type { APIRoute } from 'astro';

export const prerender = false;

// Simple health check for the mount root.
export const GET: APIRoute = () =>
  new Response(JSON.stringify({ ok: true, endpoint: 'api/vacancies' }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
