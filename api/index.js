// Vercel's one function: every /api/* path is rewritten to it (vercel.json), and it answers through
// the API's own thin entry, built by the root vercel-build script (docs/development/setup.md, The
// deployment).
export { default } from '../apps/api/dist/function.js';
