// @ts-check
import { defineConfig } from 'astro/config';

// Base path and the Cloudflare adapter are injected by Webflow Cloud at build
// time from the environment's mount path — do not set `base` here.
export default defineConfig({
  output: 'server',
});
