/** Sunucudan istemciye giden, serilestirilmis sekiller. Tarihler "YYYY-MM-DD". */
export type SayingDTO = {
  id: string;
  addedBy: string | null;
  text: string;
  saidAt: string;
  context: string | null;
  audioUrl: string | null;
  isFavorite: boolean;
};

export type PhotoDTO = {
  id: string;
  addedBy: string | null;
  takenAt: string;
  caption: string | null;
  width: number;
  height: number;
  isFavorite: boolean;
  url: string;
  thumbUrl: string;
};

export type VideoDTO = {
  id: string;
  addedBy: string | null;
  takenAt: string;
  caption: string | null;
  durationSec: number | null;
  sizeBytes: number;
  url: string;
  posterUrl: string | null;
};

export type MilestoneDTO = {
  id: string;
  addedBy: string | null;
  title: string;
  date: string;
  note: string | null;
  photoId: string | null;
  photoThumbUrl: string | null;
};

export type MeasurementDTO = {
  id: string;
  date: string;
  heightCm: number | null;
  weightKg: number | null;
  note: string | null;
};

export type LetterDTO = {
  id: string;
  title: string;
  /** Muhurluyse null */
  body: string | null;
  openAt: string;
  createdAt: string;
  authorName: string;
  isAuthor: boolean;
  sealed: boolean;
};

export type RecordingDTO = {
  id: string;
  addedBy: string | null;
  title: string;
  recordedAt: string;
  note: string | null;
  durationSec: number | null;
  url: string;
};

export type FeedItem =
  | { kind: "saying"; date: string; saying: SayingDTO }
  | { kind: "photo"; date: string; photo: PhotoDTO }
  | { kind: "video"; date: string; video: VideoDTO }
  | { kind: "milestone"; date: string; milestone: MilestoneDTO }
  | { kind: "recording"; date: string; recording: RecordingDTO };
