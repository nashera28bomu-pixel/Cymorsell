# Tests

`csvImportService` and formatting tests run standalone (no DB) via `npm test`.

For full integration coverage (auth, tenant isolation, cart calculation,
order creation, payment confirmation, admin authorization) against a real
MongoDB, point `MONGODB_URI` at a disposable test database (e.g. a free
MongoDB Atlas cluster or `mongodb-memory-server`) and add tests under this
folder following the same `node:test` + `node:assert` pattern used in
`csvImport.test.js`. This wasn't wired into `npm test` by default so the
suite still passes with zero setup on a fresh clone.
