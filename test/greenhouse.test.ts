import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fetchVacancies, normalizeJob, getLocations } from '../src/lib/greenhouse.ts';

const fixture = JSON.parse(readFileSync(new URL('./fixture-greenhouse-jobs.json', import.meta.url), 'utf8'));
const fakeFetch = (async () => new Response(JSON.stringify(fixture))) as typeof fetch;

test('maps real Greenhouse response', async () => {
  const jobs = await fetchVacancies('flowdesk', undefined, fakeFetch);
  assert.equal(jobs.length, 2);
  assert.deepEqual(jobs[0], {
    id: 4998666101,
    full_title: 'Markets | Algo Trader Intern',
    department: 'Liquidity Provision',
    locations: ['Paris, France'],
    url: 'https://job-boards.eu.greenhouse.io/flowdesk/jobs/4998666101',
    updated_at: '2026-10-07T08:05:50-04:00',
  });
  assert.equal(jobs[1].department, 'APAC Desk');
  assert.deepEqual(jobs[1].locations, ['Singapore']);
});

test('Remote in Location field wins over offices', () => {
  assert.deepEqual(getLocations({ id: 1, title: 'x', absolute_url: 'u', location: { name: 'remote' },
    offices: [{ id: 1, name: 'Paris', location: 'Paris, France', parent_id: null }] }), ['Remote']);
});

test('falls back to Location field without offices', () => {
  assert.deepEqual(getLocations({ id: 1, title: 'x', absolute_url: 'u', location: { name: 'Dubai' }, offices: [] }), ['Dubai']);
});

test('skips parent office when child attached', () => {
  assert.deepEqual(getLocations({ id: 1, title: 'x', absolute_url: 'u', location: null, offices: [
    { id: 10, name: 'EMEA', location: 'Europe', parent_id: null },
    { id: 11, name: 'London', location: 'London, United Kingdom', parent_id: 10 },
  ] }), ['London, United Kingdom']);
});

test('no department → empty string', () => {
  assert.equal(normalizeJob({ id: 1, title: 'x', absolute_url: 'u', departments: [] }).department, '');
});

test('upstream error throws', async () => {
  await assert.rejects(fetchVacancies('flowdesk', undefined, (async () => new Response('', { status: 404 })) as typeof fetch));
});
