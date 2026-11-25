// Load test for the SDK evaluate endpoint (POST /evaluate/:flagKey), the hot path.
//
//   API_KEY=fk_... FLAG_KEY=checkout pnpm load-test
//
// Optional env: API_URL (http://localhost:8000), CONNECTIONS (10), DURATION (10, seconds),
// PIPELINING (1), USERS (how many distinct userIds to spread requests over), and
// RATE (requests per second to send in total, e.g. RATE=500). Without RATE it sends as fast as
// the server answers, which measures the maximum.
// Every request sends a different user, so the rollout hashing runs for real users
// instead of one cached answer. Point it at a local or staging server, never production.
import autocannon from "autocannon";

const env = (name, fallback) => process.env[name] ?? fallback;
const apiKey = env("API_KEY");
const flagKey = env("FLAG_KEY");

if (!apiKey || !flagKey) {
  console.error("Set API_KEY and FLAG_KEY, e.g. API_KEY=fk_... FLAG_KEY=checkout pnpm load-test");
  process.exit(1);
}

const baseUrl = env("API_URL", "http://localhost:8000");
const users = Number(env("USERS", 1_000));
const countries = ["IN", "US", "GB", "DE", "BR"];
const plans = ["free", "pro", "premium"];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const result = await autocannon({
  url: `${baseUrl}/evaluate/${encodeURIComponent(flagKey)}`,
  method: "POST",
  connections: Number(env("CONNECTIONS", 10)),
  pipelining: Number(env("PIPELINING", 1)),
  duration: Number(env("DURATION", 10)),
  ...(process.env.RATE && { overallRate: Number(process.env.RATE) }),
  headers: { "content-type": "application/json", "x-api-key": apiKey },
  requests: [
    {
      setupRequest: (request) => ({
        ...request,
        body: JSON.stringify({
          userId: `user_${Math.floor(Math.random() * users)}`,
          properties: {
            country: pick(countries),
            plan: pick(plans),
            age: 18 + Math.floor(Math.random() * 50),
          },
        }),
      }),
    },
  ],
});

console.log(autocannon.printResult(result));

// 4xx/5xx and timeouts mean the numbers above aren't measuring real evaluations.
const failed = result.non2xx + result.errors + result.timeouts;
if (failed > 0) {
  console.error(
    `\n${failed} requests failed (non-2xx: ${result.non2xx}, errors: ${result.errors}, timeouts: ${result.timeouts}). Check API_KEY and FLAG_KEY.`,
  );
  process.exit(1);
}
