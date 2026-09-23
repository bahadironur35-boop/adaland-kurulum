import { getBirthDate } from "@/lib/brand";
import { listVideos } from "@/lib/queries";
import { VideoGrid } from "@/components/VideoGrid";
import { VideoUploader } from "@/components/VideoUploader";
import { StorageWarning } from "@/components/StorageWarning";

export const metadata = { title: "Videolar" };
export const dynamic = "force-dynamic";

export default async function VideolarPage() {
  const [birth, videos] = await Promise.all([getBirthDate(), listVideos()]);
  return (
    <div>
      <StorageWarning />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-3xl font-bold">Videolar</h1>
          <span className="font-hand text-lg text-ink-soft">{videos.length} video</span>
        </div>
        <VideoUploader />
      </div>
      <VideoGrid videos={videos} birth={birth} />
    </div>
  );
}
