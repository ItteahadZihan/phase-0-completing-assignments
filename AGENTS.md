# AGENTS.md

## Cursor Cloud specific instructions

This is a minimal Learn.co/Flatiron educational lab. There is no application server,
build step, or UI. `.learn` lists `languages: none`, and the entire "product" is a
single Mocha test suite.

- Run tests: `npm test` (defined in `package.json`). It runs Mocha with the
  `mocha-multi` reporter, printing to stdout and writing JSON to `.results.json`.
- The single test (`test/index-test.js`) only asserts that a `.git` directory exists,
  i.e. that the lesson was cloned correctly. It passes out of the box once `node_modules`
  is installed.
- There is no lint script and no build step.
- The `.github/workflows` job only syncs `README.md` to Canvas on push to
  `master`/`main`; it is unrelated to local development.
- Dependencies are old (chai 3.x, mocha 6.x, jsdom 9.x) but install and run fine on the
  Node version provided by the environment.
