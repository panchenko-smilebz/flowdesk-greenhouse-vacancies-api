# flowdesk-greenhouse-vacancies-api

Webflow Cloud app (Astro) that proxies the public Greenhouse Job Board API for the Flowdesk Careers page.
Replaces the Workable proxy (`/workable-vacancies-api`), which stays deployed for rollback.

## Endpoint

`GET /greenhouse-vacancies-api/api/vacancies` (mount path set in Webflow Cloud)

```json
{
  "jobs": [
    {
      "id": 4998666101,
      "full_title": "Markets | Algo Trader Intern",
      "department": "Liquidity Provision",
      "locations": ["Paris, France"],
      "url": "https://job-boards.eu.greenhouse.io/flowdesk/jobs/4998666101",
      "updated_at": "2026-10-07T08:05:50-04:00"
    }
  ],
  "meta": { "total": 1, "source": "greenhouse" }
}
```

Cached for 5 minutes (`Cache-Control: public, max-age=300`).

## Mapping rules

- `full_title` ← `title`
- `department` ← `departments[].name` (child level, as attached in Greenhouse)
- `locations`:
  - Location field contains "remote" → `["Remote"]`
  - otherwise leaf `offices[].location` (e.g. "Paris, France")
  - no offices → Location field as is
- `url` ← `absolute_url`
- Workplace type and keywords are not provided (filter removed from the site).

## Environment variables (optional)

| Name | Default |
| --- | --- |
| `GREENHOUSE_BOARD_TOKEN` | `flowdesk` |
| `GREENHOUSE_API_BASE` | `https://boards-api.greenhouse.io/v1/boards` |

## Development

```bash
npm install
npm test        # mapping tests on a real Greenhouse response
npm run dev
```

`webflow-snippets/careers-jobs.js` is the JOBS block for the Careers page footer code.
