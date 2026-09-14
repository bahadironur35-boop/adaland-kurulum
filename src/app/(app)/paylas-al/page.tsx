import { ShareReceiver } from "./ShareReceiver";

export const metadata = { title: "Paylaşılanlar" };

export default function PaylasAlPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Paylaşılanlar</h1>
      <p className="font-hand text-lg text-ink-soft mb-5">Telefondan gönderilen fotoğraf ve videolar.</p>
      <ShareReceiver />
    </div>
  );
}
