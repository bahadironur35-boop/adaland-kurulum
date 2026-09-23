import { z } from "zod";
import { handle } from "@/lib/api";
import { requireParent, HttpError } from "@/lib/auth";
import { listTrash, restore, purge, TRASH_LABEL, type TrashType } from "@/lib/trash";

const TYPES = Object.keys(TRASH_LABEL) as [TrashType, ...TrashType[]];
const body = z.object({
  action: z.enum(["restore", "purge"]),
  type: z.enum(TYPES),
  id: z.string().min(1).max(60),
});

export async function GET() {
  return handle(async () => {
    await requireParent();
    return { items: await listTrash() };
  });
}

/** Geri al ya da kalici sil. Ikisi de yalnizca cop kutusundaki kayitlara dokunur. */
export async function POST(req: Request) {
  return handle(async () => {
    await requireParent();
    const d = body.parse(await req.json());
    const ok = d.action === "restore" ? await restore(d.type, d.id) : await purge(d.type, d.id);
    if (!ok) throw new HttpError(404, "Kayıt çöp kutusunda bulunamadı.");
    return { ok: true };
  });
}
