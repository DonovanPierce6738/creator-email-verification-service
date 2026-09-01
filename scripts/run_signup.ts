const serviceUrl = process.env.SERVICE_URL ?? "http://localhost:3000";
const email = process.env.DEMO_CREATOR_EMAIL;
if (!email) throw new Error("DEMO_CREATOR_EMAIL is required");

const response = await fetch(`${serviceUrl}/creator-signups`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    creatorId: "creator-demo-01",
    email,
    channelName: "Frame by Frame",
  }),
});

const result = await response.json();
if (!response.ok) throw new Error(JSON.stringify(result));
console.log(result);
