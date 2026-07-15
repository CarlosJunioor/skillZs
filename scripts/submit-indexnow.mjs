const ORIGIN = "https://skillzs.dev";
const HOST = new URL(ORIGIN).host;
const KEY = "6d9e8a2f4c1b47f3a0d5e8c2b719463a";
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

const DEFAULT_PATHS = [
  "/",
  "/browse",
  "/guides",
  "/research/agent-skills-report-2026",
  "/guides/how-to-create-agent-skills",
  "/guides/how-to-publish-agent-skills",
  "/guides/best-agent-skills",
  "/guides/how-to-install-agent-skills",
  "/guides/agent-skills-vs-mcp",
  "/guides/agent-skill-security",
];

function normalizeUrl(value) {
  const url = new URL(value, ORIGIN);
  if (url.origin !== ORIGIN) {
    throw new Error(`IndexNow URL must belong to ${HOST}: ${value}`);
  }
  url.hash = "";
  return url.href;
}

async function verifyKeyIsDeployed() {
  const response = await fetch(KEY_LOCATION, { cache: "no-store" });
  const deployedKey = response.ok ? (await response.text()).trim() : "";
  if (deployedKey !== KEY) {
    throw new Error(`Deploy the IndexNow key before submitting: ${KEY_LOCATION}`);
  }
}

async function submit() {
  const requested = process.argv.slice(2);
  const urlList = [...new Set((requested.length ? requested : DEFAULT_PATHS).map(normalizeUrl))];

  if (urlList.length > 10_000) {
    throw new Error("IndexNow accepts at most 10,000 URLs per request.");
  }

  await verifyKeyIsDeployed();

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });

  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(`IndexNow rejected the submission (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  console.log(`IndexNow accepted ${urlList.length} changed URL${urlList.length === 1 ? "" : "s"}.`);
}

submit().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
