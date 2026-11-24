import { $ } from "bun";

const compose = [
  "docker",
  "compose",
  "-f",
  "docker-compose.test.yml",
  "-p",
  `talktivity-test-${process.pid}`,
];
try {
  await $`${compose} up -d --wait --wait-timeout 90`;
  for (const path of [
    "supabase/test/bootstrap.sql",
    "supabase/migrations/0001_profiles.sql",
    "supabase/migrations/0002_billing.sql",
    "supabase/migrations/0003_products.sql",
  ]) {
    await $`${compose} exec -T db psql -U postgres -d talktivity_test -v ON_ERROR_STOP=1 < ${Bun.file(path)}`;
  }
  await $`bun test --timeout 30000 ./tests/db/`.env({
    ...process.env,
    TEST_DATABASE_URL: "postgres://postgres:local-test-only@127.0.0.1:54329/talktivity_test",
  });
} finally {
  await $`${compose} down`;
}
