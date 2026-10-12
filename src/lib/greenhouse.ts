// Greenhouse Job Board API → format consumed by the Careers page script.
// Docs: https://developers.greenhouse.io/job-board.html (GET endpoints are public, no key).

export const DEFAULT_BOARD_TOKEN = 'flowdesk';
export const DEFAULT_API_BASE = 'https://boards-api.greenhouse.io/v1/boards';

interface GhDepartment {
  id: number;
  name: string | null;
  parent_id: number | null;
}

interface GhOffice {
  id: number;
  name: string | null;
  location: string | null;
  parent_id: number | null;
}

export interface GhJob {
  id: number;
  title: string | null;
  absolute_url: string | null;
  location?: { name: string | null } | null;
  departments?: GhDepartment[] | null;
  offices?: GhOffice[] | null;
}

export interface Vacancy {
  id: number;
  full_title: string;
  department: string;
  locations: string[];
  url: string;
  updated_at?: string;
}

const clean = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const unique = (values: string[]): string[] => [...new Set(values.filter(Boolean))];

const isRemote = (value: string): boolean => /\bremote\b/i.test(value);

/**
 * Locations shown on the card and used for the Location filter.
 * - "Remote" in the job's Location field wins (agreed with the client).
 * - Otherwise leaf offices' full location ("Paris, France"); parent offices
 *   such as regions are skipped when a child office is also attached.
 * - Falls back to the free-text Location field when no office is set.
 */
export function getLocations(job: GhJob): string[] {
  const locationName = clean(job.location?.name);

  if (locationName && isRemote(locationName)) {
    return ['Remote'];
  }

  const offices = Array.isArray(job.offices) ? job.offices : [];
  const officeIds = new Set(offices.map((office) => office.id));
  const leafOffices = offices.filter(
    (office) => !offices.some((other) => other.parent_id === office.id && officeIds.has(other.id)),
  );

  const fromOffices = unique(leafOffices.map((office) => clean(office.location) || clean(office.name)));
  if (fromOffices.length) return fromOffices;

  return locationName ? [locationName] : [];
}

/** Department as attached to the job in Greenhouse (child level, agreed with the client). */
export function getDepartment(job: GhJob): string {
  const departments = Array.isArray(job.departments) ? job.departments : [];
  return unique(departments.map((department) => clean(department.name))).join(', ');
}

export function normalizeJob(job: GhJob & { updated_at?: string }): Vacancy {
  return {
    id: job.id,
    full_title: clean(job.title),
    department: getDepartment(job),
    locations: getLocations(job),
    url: clean(job.absolute_url),
    updated_at: job.updated_at,
  };
}

export async function fetchVacancies(
  boardToken: string = DEFAULT_BOARD_TOKEN,
  apiBase: string = DEFAULT_API_BASE,
  fetchImpl: typeof fetch = fetch,
): Promise<Vacancy[]> {
  const url = `${apiBase.replace(/\/+$/, '')}/${encodeURIComponent(boardToken)}/jobs?content=true`;
  const response = await fetchImpl(url, { headers: { Accept: 'application/json' } });

  if (!response.ok) {
    throw new Error(`Greenhouse responded with ${response.status}`);
  }

  const data = (await response.json()) as { jobs?: GhJob[] };
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];

  return jobs.map(normalizeJob).filter((job) => job.full_title && job.url);
}
