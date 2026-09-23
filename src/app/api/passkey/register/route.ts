import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent, HttpError } from "@/lib/auth";
import { rp, rememberChallenge, takeChallenge, deviceLabel } from "@/lib/webauthn";
import { getBrandSafe } from "@/lib/brand";

/**
 * POST {step:"options"}  -> tarayiciya verilecek kayit secenekleri
 * POST {step:"verify", response, label?} -> passkey'i kaydet
 * Sadece oturumlu hesap kendi cihazini ekleyebilir.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const me = await requireParent();
    const body = (await req.json()) as { step?: string; response?: RegistrationResponseJSON; label?: string };
    const { rpID, origin } = await rp();

    if (body.step === "options") {
      const existing = await prisma.passkey.findMany({ where: { parentId: me.id }, select: { credentialId: true, transports: true } });
      const options = await generateRegistrationOptions({
        rpName: (await getBrandSafe()).siteName,
        rpID,
        userID: new TextEncoder().encode(me.id),
        userName: me.email,
        userDisplayName: me.name,
        attestationType: "none",
        excludeCredentials: existing.map((p) => ({ id: p.credentialId, transports: p.transports ? (JSON.parse(p.transports) as AuthenticatorTransport[]) : undefined })),
        authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
      });
      await rememberChallenge(options.challenge, { parentId: me.id });
      return options;
    }

    if (body.step === "verify" && body.response) {
      const c = await takeChallenge();
      if (!c || c.parentId !== me.id) throw new HttpError(400, "Süre doldu, tekrar dene.");
      const v = await verifyRegistrationResponse({ response: body.response, expectedChallenge: c.challenge, expectedOrigin: origin, expectedRPID: rpID });
      if (!v.verified || !v.registrationInfo) throw new HttpError(400, "Cihaz doğrulanamadı.");
      const { credential, credentialDeviceType, credentialBackedUp } = v.registrationInfo;
      const label = z.string().trim().min(1).max(60).catch(deviceLabel(req.headers.get("user-agent"))).parse(body.label ?? "");
      await prisma.passkey.create({
        data: {
          parentId: me.id,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: BigInt(credential.counter),
          transports: credential.transports ? JSON.stringify(credential.transports) : null,
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          label,
        },
      });
      return { ok: true, label };
    }
    throw new HttpError(400, "Geçersiz adım.");
  });
}
