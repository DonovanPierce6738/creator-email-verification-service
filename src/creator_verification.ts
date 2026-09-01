import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { accessForEmailVerification, type CreatorAccess } from "./creator_access.js";
import { infrai } from "./infrai_email.js";

export const signupBody = z.object({
  creatorId: z.string().min(1).max(80),
  email: z.string().email(),
  channelName: z.string().min(1).max(100),
});

export const verificationBody = z.object({
  creatorId: z.string().min(1).max(80),
  token: z.string().min(1),
});

type CreatorRecord = {
  email: string;
  channelName: string;
  verified: boolean;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export type SignupResult = {
  creatorId: string;
  messageId: string;
  verificationState: "pending";
  access: CreatorAccess;
};

export class CreatorVerification {
  private readonly creators = new Map<string, CreatorRecord>();
  private readonly publicBaseUrl: string;
  private readonly signingSecret: string;

  constructor(publicBaseUrl: string, signingSecret: string) {
    this.publicBaseUrl = publicBaseUrl;
    this.signingSecret = signingSecret;
  }

  private tokenFor(creatorId: string, email: string): string {
    return createHmac("sha256", this.signingSecret)
      .update(`${creatorId}:${email}`)
      .digest("hex");
  }

  async signup(input: z.infer<typeof signupBody>): Promise<SignupResult> {
    this.creators.set(input.creatorId, {
      email: input.email,
      channelName: input.channelName,
      verified: false,
    });

    const token = this.tokenFor(input.creatorId, input.email);
    const verificationUrl = new URL("/verify-email", this.publicBaseUrl);
    verificationUrl.searchParams.set("creatorId", input.creatorId);
    verificationUrl.searchParams.set("token", token);
    const channelName = escapeHtml(input.channelName);

    const sent = await infrai.email.send(
      {
        to: input.email,
        subject: `Verify email for ${input.channelName}`,
        html: `<h1>Finish your creator signup</h1><p>Confirm the address for ${channelName}.</p><p><a href="${verificationUrl.toString()}">Verify email</a></p>`,
      },
      `creator-verification:${input.creatorId}`,
    );

    return {
      creatorId: input.creatorId,
      messageId: sent.message_id,
      verificationState: "pending",
      access: accessForEmailVerification(false),
    };
  }

  verify(input: z.infer<typeof verificationBody>): CreatorAccess | undefined {
    const creator = this.creators.get(input.creatorId);
    if (!creator) return undefined;

    const expected = Buffer.from(this.tokenFor(input.creatorId, creator.email));
    const supplied = Buffer.from(input.token);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      return undefined;
    }

    creator.verified = true;
    return accessForEmailVerification(creator.verified);
  }
}
