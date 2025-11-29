// src/pages/WorksPage.tsx
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "../firebase/config";
import { useAuth } from "../auth/AuthContext";
import type { Work } from "../works/types";

type FirestoreWork = {
  userId: string;
  title: string;
  description: string | null;
  createdAt: number;
  imageUrl?: string | null;
  imagePath?: string | null;
};

export default function WorksPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [works, setWorks] = useState<Work[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 내 작품 리스트 구독 (정렬은 나중에)
  useEffect(() => {
    if (!user) return;

    const worksRef = collection(db, "works");
    const q = query(worksRef, where("userId", "==", user.uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: Work[] = snap.docs.map((doc) => {
          const data = doc.data() as FirestoreWork;
          return {
            id: doc.id,
            userId: data.userId,
            title: data.title,
            description: data.description,
            createdAt: data.createdAt,
            imageUrl: data.imageUrl ?? null,
            imagePath: data.imagePath ?? null,
          };
        });
        // createdAt 기준 정렬은 클라이언트에서
        items.sort((a, b) => b.createdAt - a.createdAt);
        setWorks(items);
      },
      (err) => {
        console.error("onSnapshot error", err);
        setError(err.message ?? "Failed to load works");
      }
    );

    return () => unsub();
  }, [user]);

  // 파일 선택
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (!selected) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setPreviewUrl(result);
      }
    };
    reader.readAsDataURL(selected);
  }

  // 폼 제출
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      setError("로그인 상태가 아닙니다.");
      return;
    }
    if (!title.trim()) return;

    setSaving(true);
    setError(null);

    try {
      let imageUrl: string | null = null;
      let imagePath: string | null = null;

      if (file) {
        // 업로드 전에 파일 크기 간단 체크 (예: 10MB 제한)
        const maxSizeMb = 10;
        if (file.size > maxSizeMb * 1024 * 1024) {
          throw new Error(`파일이 너무 큽니다. 최대 ${maxSizeMb}MB까지 업로드 가능합니다.`);
        }

        const path = `works/${user.uid}/${Date.now()}_${file.name}`;
        const ref = storageRef(storage, path);
        // 👉 여기서 실제로 시간이 좀 걸릴 수 있음
        await uploadBytes(ref, file);
        imageUrl = await getDownloadURL(ref);
        imagePath = path;
      }

      const worksRef = collection(db, "works");
      await addDoc(worksRef, {
        userId: user.uid,
        title: title.trim(),
        description: description.trim() || null,
        createdAt: Date.now(),
        imageUrl,
        imagePath,
      });

      setTitle("");
      setDescription("");
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "작품 저장 중 오류가 발생했습니다.";
      console.error("save work error", err);
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">ArtfolioX</h1>
      </header>

      <main className="app-main works-main">
        <section className="work-form-card">
          <h2>New work</h2>
          <p className="hint-text">
            작품 제목, 간단 메모, 사진 한 장부터 기록해 봅시다.
          </p>

          <form onSubmit={handleSubmit} className="work-form">
            <label>
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            <label>
              <span>Note</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </label>

            <label>
              <span>Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              {previewUrl && (
                <div className="work-preview">
                  <img src={previewUrl} alt="preview" />
                </div>
              )}
            </label>

            {error && <p className="error-text">{error}</p>}

            <button type="submit" disabled={saving || !title.trim()}>
              {saving ? "Saving..." : "Save work"}
            </button>
          </form>
        </section>

        <section className="work-list">
          <h2>My works</h2>
          {works.length === 0 ? (
            <p className="hint-text">아직 등록된 작품이 없습니다.</p>
          ) : (
            <ul>
              {works.map((w) => (
                <li key={w.id} className="work-item">
                  <div className="work-item-main">
                    {w.imageUrl && (
                      <div className="work-image">
                        <img src={w.imageUrl} alt={w.title} />
                      </div>
                    )}
                    <div className="work-text">
                      <div className="work-title">{w.title}</div>
                      {w.description && (
                        <div className="work-desc">{w.description}</div>
                      )}
                      <div className="work-meta">
                        {new Date(w.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
