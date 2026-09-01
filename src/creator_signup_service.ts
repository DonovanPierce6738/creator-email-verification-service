import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { CreatorVerification, signupBody, verificationBody } from "./creator_verification.js";
import { InfraiError } from "./infrai_email.js";

const port = Number(process.env.PORT ?? 3000);
const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`;
const signingSecret = process.env.VERIFICATION_SIGNING_SECRET;
if (!signingSecret) throw new Error("VERIFICATION_SIGNING_SECRET is required");

const workflow = new CreatorVerification(publicBaseUrl, signingSecret);

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", publicBaseUrl);

    if (request.method === "POST" && request.url === "/creator-signups") {
      const input = signupBody.parse(await readJson(request));
      json(response, 201, await workflow.signup(input));
      return;
    }

    if (request.method === "POST" && request.url === "/email-verifications") {
      const input = verificationBody.parse(await readJson(request));
      const access = workflow.verify(input);
      if (!access) {
        json(response, 400, { error: "Verification link is invalid" });
        return;
      }
      json(response, 200, { verificationState: "verified", access });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/verify-email") {
      const input = verificationBody.parse({
        creatorId: requestUrl.searchParams.get("creatorId"),
        token: requestUrl.searchParams.get("token"),
      });
      const access = workflow.verify(input);
      if (!access) {
        json(response, 400, { error: "Verification link is invalid" });
        return;
      }
      json(response, 200, { verificationState: "verified", access });
      return;
    }

    json(response, 404, { error: "Route not found" });
  } catch (error) {
    if (error instanceof ZodError) {
      json(response, 400, { error: "Invalid request body", issues: error.issues });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      json(response, status, { error: error.code, message: error.message });
      return;
    }
    json(response, 500, { error: "Request could not be completed" });
  }
}).listen(port, () => {
  console.log(`Creator signup service listening on ${publicBaseUrl}`);
});
