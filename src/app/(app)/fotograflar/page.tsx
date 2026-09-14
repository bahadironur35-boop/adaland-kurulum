import { getBirthDate } from "@/lib/brand";
import { listPhotos } from "@/lib/queries";
import { PhotoGrid } from "@/components/PhotoGrid";
import { PhotoUploader } from "@/components/PhotoUploader";
import { StorageWarning } from "@/components/StorageWarning";

export const metadata = { title: "Fotoğraflar" };
export const dynamic = "force-dynamic";

export default async function FotograflarPage() {
  const [birth, photos] = await Promise.all([getBirthDate(), listPhotos()]);
  return (
    <div>
      <StorageWarning />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-3xl font-bold">Fotoğraflar</h1>
          <span className="font-hand text-lg text-ink-soft">{photos.length} anı</span>
        </div>
        <PhotoUploader />
      </div>
      <PhotoGrid photos={photos} birth={birth} />
    </div>
  );
}
