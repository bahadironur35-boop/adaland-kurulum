import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { shareCreate } from "@/lib/schemas";
import { newToken, shareStatus, OYUN_ODASI_LINK_ETIKETI } from "@/lib/share";

export type ShareLinkDTO = {
  id: string;
  token: string;
  label: string;
  status: "active" | "expired" | "revoked";
  expiresAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
};

export async function listShareLinks(): Promise<ShareLinkDTO[]> {
  // Oyun Odasi linki bu listede GORUNMUYOR: bir akraba degil, uygulama-arasi
  // baglanti. Etiketi de "kim bu?" sorusu dogurmadan gizlice cikariliyor.
  const rows = await prisma.shareLink.findMany({ where: { label: { not: OYUN_ODASI_LINK_ETIKETI } }, orderBy: { createdAt: "desc" } });
  return rows.map((l) => ({
    id: l.id,
    token: l.token,
    label: l.label,
    status: shareStatus(l),
    expiresAt: l.expiresAt?.toISOString() ?? null,
    viewCount: l.viewCount,
    lastViewedAt: l.lastViewedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
  }));
}

export async function GET() {
  return handle(async () => {
    await requireParent();
    return { links: await listShareLinks() };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireParent();
    const d = shareCreate.parse(await req.json());
    const expiresAt = d.days ? new Date(Date.now() + d.days * 86_400_000) : null;
    const l = await prisma.shareLink.create({ data: { token: newToken(), label: d.label, expiresAt } });
    return { id: l.id, token: l.token };
  });
}
