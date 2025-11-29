import { AppHeader } from "../layout/AppHeader";
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import type { Work } from "../works/types";

const WORKS_KEY_PREFIX = "artfoliox_works_";

function getWorksKey(email: string) {
  return `${WORKS_KEY_PREFIX}${email}`;
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function WorksPage() {
  const { user } = useAuth();

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [project, setProject] = useState("");
  const [year, setYear] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // list state
  const [works, setWorks] = useState<Work[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // filter state
  const [filterText, setFilterText] = useState("");
  const [filterProject, setFilterProject] = useState("");

  // 로그인한 유저의 작품 목록 로드
  useEffect(() => {
    if (!user?.email) {
      setWorks([]);
      return;
    }
    const key = getWorksKey(user.email);
    const raw = localStorage.getItem(key);
    if (!raw) {
      setWorks([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Work[];
      // createdAt 기준 내림차순 정렬
      parsed.sort((a, b) => b.createdAt - a.createdAt);
      setWorks(parsed);
    } catch {
      setWorks([]);
    }
  }, [user]);

  function persist(updated: Work[]) {
    if (!user?.email) return;
    const key = getWorksKey(user.email);
    localStorage.setItem(key, JSON.stringify(updated));
  }

  // 이미지 선택 → data URL로 미리보기
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;

    if (!selected) {
      setPreviewUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setPreviewUrl(result); // data:image/...;base64,...
      }
    };
    reader.readAsDataURL(selected);
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setProject("");
    setYear("");
    setTagsInput("");
    setPreviewUrl(null);
    setEditingId(null);
    setError(null);
  }

  // 새 작품 생성 또는 기존 작품 수정
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user?.email) {
      setError("로그인 상태가 아닙니다.");
      return;
    }
    if (!title.trim()) return;

    setSaving(true);
    setError(null);

    const tags =
      tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0) ?? [];

    const now = Date.now();

    if (editingId) {
      // 수정 모드
      const updated = works.map((w) => {
        if (w.id !== editingId) return w;

        return {
          ...w,
          title: title.trim(),
          description: description.trim() || null,
          project: project.trim() || null,
          year: year.trim() || null,
          tags,
          imageData: previewUrl ?? w.imageData ?? null,
          // createdAt 은 그대로 유지
        };
      });

      updated.sort((a, b) => b.createdAt - a.createdAt);
      setWorks(updated);
      persist(updated);
    } else {
      // 새로 추가
      const newWork: Work = {
        id: makeId(),
        userEmail: user.email,
        title: title.trim(),
        description: description.trim() || null,
        createdAt: now,
        imageData: previewUrl ?? null,
        project: project.trim() || null,
        year: year.trim() || null,
        tags,
      };

      const updated = [newWork, ...works];
      setWorks(updated);
      persist(updated);
    }

    setSaving(false);
    resetForm();
  }

  // 수정 시작
  function handleEdit(work: Work) {
    setEditingId(work.id);
    setTitle(work.title);
    setDescription(work.description ?? "");
    setProject(work.project ?? "");
    setYear(work.year ?? "");
    setTagsInput(work.tags?.join(", ") ?? "");
    setPreviewUrl(work.imageData ?? null);
    setError(null);
  }

  // 삭제
  function handleDelete(id: string) {
    const updated = works.filter((w) => w.id !== id);
    setWorks(updated);
    persist(updated);
    if (editingId === id) {
      resetForm();
    }
  }

  if (!user?.email) {
    return (
      <div className="app-root">
        <p>로그인 후 작품을 관리할 수 있습니다.</p>
      </div>
    );
  }

  // 필터 적용
  const visibleWorks = works.filter((w) => {
    const text = filterText.trim().toLowerCase();
    const proj = filterProject.trim().toLowerCase();

    const matchesText =
      !text ||
      w.title.toLowerCase().includes(text) ||
      (w.description ?? "").toLowerCase().includes(text) ||
      (w.tags ?? []).some((t) => t.toLowerCase().includes(text));

    const matchesProject =
      !proj || (w.project ?? "").toLowerCase().includes(proj);

    return matchesText && matchesProject;
  });

  return (
    <div className="app-root">
      <AppHeader />

      <main className="app-main works-main">
        <section className="work-form-card">
          <h2>{editingId ? "Edit work" : "New work"}</h2>
          <p className="hint-text">
            작품 제목, 프로젝트, 연도, 태그, 이미지까지 한 번에 저장할 수 있습니다.
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
              <span>Project</span>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="예: 입시 포트폴리오, 개인 작업"
              />
            </label>

            <label>
              <span>Year</span>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="예: 2024"
              />
            </label>

            <label>
              <span>Tags (comma separated)</span>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="예: 인물, 유화, 흑백"
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

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="submit" disabled={saving || !title.trim()}>
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Save changes"
                  : "Save work"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    fontSize: 12,
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid #4b5563",
                    background: "transparent",
                    color: "#e5e7eb",
                    cursor: "pointer",
                  }}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="work-list">
          <h2>My works</h2>

          <div className="filter-bar">
            <input
              placeholder="Search title, note, tags"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <input
              placeholder="Filter by project"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
            />
          </div>

          {visibleWorks.length === 0 ? (
            <p className="hint-text">조건에 맞는 작품이 없습니다.</p>
          ) : (
            <ul>
              {visibleWorks.map((w) => (
                <li key={w.id} className="work-item">
                  <div className="work-item-main">
                    {w.imageData && (
                      <div className="work-image">
                        <img src={w.imageData} alt={w.title} />
                      </div>
                    )}
                    <div className="work-text">
                      <div className="work-title">{w.title}</div>
                      <div className="work-meta-line">
                        {w.project && <span>{w.project}</span>}
                        {w.project && w.year && <span> · </span>}
                        {w.year && <span>{w.year}</span>}
                      </div>
                      {w.description && (
                        <div className="work-desc">{w.description}</div>
                      )}
                      {w.tags && w.tags.length > 0 && (
                        <div className="tag-list">
                          {w.tags.map((t) => (
                            <span key={t} className="tag-chip">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="work-meta">
                        {new Date(w.createdAt).toLocaleString()}
                      </div>

                      <div className="work-actions">
                        <button type="button" onClick={() => handleEdit(w)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(w.id)}
                        >
                          Delete
                        </button>
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
