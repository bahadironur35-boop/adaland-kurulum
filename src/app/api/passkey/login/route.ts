import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createSession, HttpError } from "@/lib/auth";
import { rp, rememberChallenge, takeChallenge } from "@/lib/webauthn";

/**
 * POST {step:"options"} -> giris secenekleri (kesfedilebilir passkey: hesap secmeden)
 * POST {step:"verify", response} -> dogrula, oturum ac
 */
export async function POST(req: Request) {
  return handle(async () => {
    const body = (await req.json()) as { step?: string; response?: AuthenticationResponseJSON };
    const { rpID, origin } = await rp();

    if (body.step === "options") {
      const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });
      await rememberChallenge(options.challenge);
      return options;
    }

    if (body.step === "verify" && body.response) {
      const c = await takeChallenge();
      if (!c) throw new HttpError(400, "Süre doldu, tekrar dene.");
      const pk = await prisma.passkey.findUnique({ where: { credentialId: body.response.id }, include: { parent: true } });
      if (!pk) throw new HttpError(401, "Bu cihaz tanınmıyor. Şifreyle girip Ayarlar'dan ekle.");
      const v = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge: c.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: pk.credentialId,
          publicKey: new Uint8Array(pk.publicKey),
          counter: Number(pk.counter),
          transports: pk.transports ? (JSON.parse(pk.transports) as AuthenticatorTransport[]) : undefined,
        },
      });
      if (!v.verified) throw new HttpError(401, "Doğrulanamadı.");
      await prisma.passkey.update({ where: { id: pk.id }, data: { counter: BigInt(v.authenticationInfo.newCounter), lastUsedAt: new Date() } });
      await prisma.parent.update({ where: { id: pk.parentId }, data: { lastLoginAt: new Date() } });
      await createSession({ id: pk.parent.id, email: pk.parent.email, name: pk.parent.name });
      return { ok: true, name: pk.parent.name };
    }
    throw new HttpError(400, "Geçersiz adım.");
  });
}
