import "dotenv/config";
import crypto from "crypto";

const BASE_URL = process.env.WEBHOOK_TEST_URL || "http://localhost:3497";
const ENDPOINT = `${BASE_URL}/api/webhooks/github`;
const SECRET = process.env.WEBHOOK_SECRET || "";

function buildPushPayload() {
  return {
    ref: "refs/heads/main",
    after: "a1b2c3d4e5f6g7h8i9j0",
    repository: {
      name: process.env.WEBHOOK_TEST_REPO || "unknown-repo",
      owner: { login: process.env.WEBHOOK_TEST_OWNER || "unknown-owner" },
    },
    head_commit: {
      message: "test webhook commit",
      author: { name: "Webhook Tester" },
    },
    pusher: { name: "Webhook Tester" },
  };
}

function signRawBody(rawBody, secret) {
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return `sha256=${digest}`;
}

async function sendWebhook({ eventType, deliveryId, bodyRaw, sign = true, secret = SECRET }) {
  const signature = sign ? signRawBody(bodyRaw, secret) : "sha256=invalid";

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": eventType,
      "x-github-delivery": deliveryId,
      "x-hub-signature-256": signature,
    },
    body: bodyRaw,
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return {
    httpStatus: response.status,
    body: json,
  };
}

async function runCase(name, setup) {
  try {
    const result = await setup();
    if (!result.pass) {
      console.log(`❌ ${name}`);
      console.log(`   Expected: ${result.expected}`);
      console.log(`   Got: ${result.actual}`);
      return false;
    }

    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("🧪 GitHub Webhook Endpoint Test");
  console.log("=".repeat(60));
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Secret configured: ${SECRET ? "yes" : "no"}`);
  console.log("");

  if (!SECRET) {
    console.log("❌ WEBHOOK_SECRET is not set in environment.");
    console.log("   Set WEBHOOK_SECRET and rerun.");
    process.exit(1);
  }

  const pushPayload = buildPushPayload();
  const pushRaw = JSON.stringify(pushPayload);

  const tests = [
    {
      name: "Valid push (unknown repo should be ignored with 200)",
      run: async () => {
        const result = await sendWebhook({
          eventType: "push",
          deliveryId: "test-delivery-push-1",
          bodyRaw: pushRaw,
          sign: true,
        });

        const pass = result.httpStatus === 200 && ["ignored", "processed"].includes(result.body?.status);
        return {
          pass,
          expected: "HTTP 200 with status ignored|processed",
          actual: `HTTP ${result.httpStatus} with status ${result.body?.status}`,
        };
      },
    },
    {
      name: "Duplicate delivery id should return duplicate",
      run: async () => {
        const deliveryId = "test-delivery-dup-1";
        await sendWebhook({
          eventType: "ping",
          deliveryId,
          bodyRaw: pushRaw,
          sign: true,
        });

        const second = await sendWebhook({
          eventType: "ping",
          deliveryId,
          bodyRaw: pushRaw,
          sign: true,
        });

        const pass = second.httpStatus === 200 && second.body?.status === "duplicate";
        return {
          pass,
          expected: "HTTP 200 with status duplicate",
          actual: `HTTP ${second.httpStatus} with status ${second.body?.status}`,
        };
      },
    },
    {
      name: "Non-push event should be ignored early",
      run: async () => {
        const result = await sendWebhook({
          eventType: "ping",
          deliveryId: "test-delivery-nonpush-1",
          bodyRaw: pushRaw,
          sign: true,
        });

        const pass = result.httpStatus === 200 && result.body?.status === "ignored";
        return {
          pass,
          expected: "HTTP 200 with status ignored",
          actual: `HTTP ${result.httpStatus} with status ${result.body?.status}`,
        };
      },
    },
    {
      name: "Invalid signature should return 401",
      run: async () => {
        const result = await sendWebhook({
          eventType: "push",
          deliveryId: "test-delivery-badsig-1",
          bodyRaw: pushRaw,
          sign: false,
        });

        const pass = result.httpStatus === 401;
        return {
          pass,
          expected: "HTTP 401",
          actual: `HTTP ${result.httpStatus}`,
        };
      },
    },
    {
      name: "Malformed JSON after valid signature should return 400",
      run: async () => {
        const malformedRaw = "{\"broken\": true";
        const result = await sendWebhook({
          eventType: "push",
          deliveryId: "test-delivery-badjson-1",
          bodyRaw: malformedRaw,
          sign: true,
        });

        const pass = result.httpStatus === 400;
        return {
          pass,
          expected: "HTTP 400",
          actual: `HTTP ${result.httpStatus}`,
        };
      },
    },
  ];

  let passed = 0;
  for (const test of tests) {
    const ok = await runCase(test.name, test.run);
    if (ok) passed += 1;
  }

  console.log("");
  console.log("=".repeat(60));
  console.log(`Result: ${passed}/${tests.length} passed`);

  if (passed !== tests.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Test runner failed", error);
  process.exit(1);
});
