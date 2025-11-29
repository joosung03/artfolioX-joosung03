import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { AppHeader } from "../layout/AppHeader";
import { useAuth } from "../auth/AuthContext";
import type { Work } from "../works/types";
import type {
  PortfolioVersion,
  PortfolioItem,
} from "../portfolios/types";

const WORKS_KEY_PREFIX = "artfoliox_works_";
const PORTFOLIOS_KEY_PREFIX = "artfoliox_portfolios_";

function getWorksKey(email: string) {
  return `${WORKS_KEY_PREFIX}${email}`;
}

function getPortfoliosKey(email: string) {
  return `${PORTFOLIOS_KEY_PREFIX}${email}`;
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function PortfoliosPage() {
  const { user } = useAuth();

  const [works, setWorks] = useState<Work[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 필터나 검색은 다음 단계에서, 일단 기본 기능에 집중

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
      parsed.sort((a, b) => b.createdAt - a.createdAt);
      setWorks(parsed);
    } catch {
      setWorks([]);
    }
  }, [user]);

  // 로그인한 유저의 포트폴리오 목록 로드
  useEffect(() => {
    if (!user?.email) {
      setPortfolios([]);
      setSelectedId(null);
      return;
    }
    const key = getPortfoliosKey(user.email);
    const raw = localStorage.getItem(key);
    if (!raw) {
      setPortfolios([]);
      setSelectedId(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as PortfolioVersion[];
      parsed.sort((a, b) => b.updatedAt - a.updatedAt);
      setPortfolios(parsed);
      if (parsed.length > 0) {
        setSelectedId((prev) => prev ?? parsed[0].id);
      }
    } catch {
      setPortfolios([]);
      setSelectedId(null);
    }
  }, [user]);

  function persistPortfolios(updated: PortfolioVersion[]) {
    if (!user?.email) return;
    const key = getPortfoliosKey(user.email);
    localStorage.setItem(key, JSON.stringify(updated));
  }

  function updatePortfolio(
    id: string,
    patch: Partial<PortfolioVersion>
  ) {
    setPortfolios((prev) => {
      const next = prev.map((p) =>
        p.id === id
          ? {
              ...p,
              ...patch,
              updatedAt: Date.now(),
            }
          : p
      );
      next.sort((a, b) => b.updatedAt - a.updatedAt);
      persistPortfolios(next);
      return next;
    });
  }

  const current =
    portfolios.find((p) => p.id === selectedId) ?? null;

  function handleCreatePortfolio(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user?.email) {
      setError("로그인 상태가 아닙니다.");
      return;
    }
    const title = newTitle.trim();
    if (!title) return;

    const now = Date.now();
    const newPortfolio: PortfolioVersion = {
      id: makeId(),
      userEmail: user.email,
      title,
      targetSchool: null,
      targetMajor: null,
      year: null,
      items: [],
      createdAt: now,
      updatedAt: now,
    };

    setPortfolios((prev) => {
      const next = [newPortfolio, ...prev];
      persistPortfolios(next);
      return next;
    });
    setSelectedId(newPortfolio.id);
    setNewTitle("");
    setError(null);
  }

  function handleDeletePortfolio(id: string) {
    setPortfolios((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistPortfolios(next);
      return next;
    });
    if (selectedId === id) {
      setSelectedId((prev) =>
        prev === id ? null : prev
      );
    }
  }

  function handleBasicFieldChange<K extends keyof PortfolioVersion>(
    key: K,
    value: PortfolioVersion[K]
  ) {
    if (!current) return;
    updatePortfolio(current.id, { [key]: value } as Partial<PortfolioVersion>);
  }

  function handleAddWorkToCurrent(workId: string) {
    if (!current) return;
    const exists = current.items.some(
      (i) => i.workId === workId
    );
    if (exists) return;

    const maxOrder =
      current.items.reduce(
        (max, i) => (i.order > max ? i.order : max),
        0
      ) ?? 0;

    const newItem: PortfolioItem = {
      workId,
      order: maxOrder + 1,
    };

    const items = [...current.items, newItem];
    updatePortfolio(current.id, { items });
  }

  function handleRemoveWorkFromCurrent(workId: string) {
    if (!current) return;
    const items = current.items.filter(
      (i) => i.workId !== workId
    );
    updatePortfolio(current.id, { items });
  }

  function handleItemCustomChange(
    workId: string,
    field: "customTitle" | "customDescription",
    value: string
  ) {
    if (!current) return;
    const items = current.items.map((item) =>
      item.workId === workId
        ? { ...item, [field]: value || null }
        : item
    );
    updatePortfolio(current.id, { items });
  }

  function handleMoveItem(workId: string, dir: "up" | "down") {
    if (!current) return;
    const sorted = [...current.items].sort(
      (a, b) => a.order - b.order
    );
    const index = sorted.findIndex(
      (i) => i.workId === workId
    );
    if (index === -1) return;

    const swapIndex =
      dir === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) {
      return;
    }

    const tmp = sorted[index];
    sorted[index] = sorted[swapIndex];
    sorted[swapIndex] = tmp;

    // order 재번호 부여
    const reOrdered = sorted.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));
    updatePortfolio(current.id, { items: reOrdered });
  }

  if (!user?.email) {
    return (
      <div className="app-root">
        <p>로그인 후 포트폴리오를 관리할 수 있습니다.</p>
      </div>
    );
  }

  const availableWorksForCurrent: Work[] = current
    ? works.filter(
        (w) =>
          !current.items.some(
            (i) => i.workId === w.id
          )
      )
    : works;

  const itemsWithWork =
    current?.items
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        item,
        work: works.find(
          (w) => w.id === item.workId
        ),
      })) ?? [];

  const totalSelected = current?.items.length ?? 0;

  return (
    <div className="app-root">
      <AppHeader />

      <main className="app-main portfolio-main">
        {/* 왼쪽 사이드바: 포트폴리오 목록 및 생성 */}
        <aside className="portfolio-sidebar">
          <h2>Portfolios</h2>

          <form
            onSubmit={handleCreatePortfolio}
            className="portfolio-new-form"
          >
            <input
              type="text"
              placeholder="새 포트폴리오 제목"
              value={newTitle}
              onChange={(e) =>
                setNewTitle(e.target.value)
              }
            />
            <button type="submit" disabled={!newTitle.trim()}>
              Add
            </button>
          </form>
          {error && (
            <p className="error-text" style={{ marginTop: 4 }}>
              {error}
            </p>
          )}

          <ul className="portfolio-list">
            {portfolios.map((p) => (
              <li
                key={p.id}
                className={
                  p.id === selectedId
                    ? "portfolio-list-item selected"
                    : "portfolio-list-item"
                }
              >
                <button
                  type="button"
                  className="portfolio-list-button"
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className="portfolio-list-title">
                    {p.title}
                  </div>
                  <div className="portfolio-list-meta">
                    {p.targetSchool && <span>{p.targetSchool}</span>}
                    {p.targetMajor && (
                      <>
                        {" "}
                        · <span>{p.targetMajor}</span>
                      </>
                    )}
                    <span>
                      {" "}
                      · {p.items.length} works
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  className="portfolio-delete-btn"
                  onClick={() =>
                    handleDeletePortfolio(p.id)
                  }
                >
                  ✕
                </button>
              </li>
            ))}
            {portfolios.length === 0 && (
              <li className="hint-text">
                아직 포트폴리오가 없습니다.
              </li>
            )}
          </ul>
        </aside>

        {/* 오른쪽: 편집 + 프리뷰 */}
        <section className="portfolio-editor">
          {!current ? (
            <p className="hint-text">
              왼쪽에서 포트폴리오를 선택하거나 새로
              생성하세요.
            </p>
          ) : (
            <>
              <div className="portfolio-basic">
                <h2>Portfolio info</h2>
                <div className="portfolio-basic-grid">
                  <label>
                    <span>Title</span>
                    <input
                      type="text"
                      value={current.title}
                      onChange={(e) =>
                        handleBasicFieldChange(
                          "title",
                          e.target.value
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>Target school</span>
                    <input
                      type="text"
                      value={current.targetSchool ?? ""}
                      onChange={(e) =>
                        handleBasicFieldChange(
                          "targetSchool",
                          e.target.value || null
                        )
                      }
                      placeholder="예: 서울대 디자인과"
                    />
                  </label>
                  <label>
                    <span>Target major</span>
                    <input
                      type="text"
                      value={current.targetMajor ?? ""}
                      onChange={(e) =>
                        handleBasicFieldChange(
                          "targetMajor",
                          e.target.value || null
                        )
                      }
                      placeholder="예: 시각디자인"
                    />
                  </label>
                  <label>
                    <span>Year</span>
                    <input
                      type="text"
                      value={current.year ?? ""}
                      onChange={(e) =>
                        handleBasicFieldChange(
                          "year",
                          e.target.value || null
                        )
                      }
                      placeholder="예: 2026"
                    />
                  </label>
                </div>
                <p className="hint-text" style={{ marginTop: 4 }}>
                  현재 포함된 작품 수 {totalSelected}개
                </p>
              </div>

              <div className="portfolio-builder">
                <div className="portfolio-column">
                  <h3>Available works</h3>
                  <p className="hint-text">
                    이 포트폴리오에 추가할 작품을 선택하세요.
                  </p>
                  <div className="portfolio-work-list">
                    {availableWorksForCurrent.length === 0 ? (
                      <p className="hint-text">
                        추가 가능한 작품이 없습니다. 먼저
                        Works 페이지에서 작품을 등록하세요.
                      </p>
                    ) : (
                      availableWorksForCurrent.map((w) => (
                        <div
                          key={w.id}
                          className="portfolio-work-card"
                        >
                          {w.imageData && (
                            <div className="portfolio-work-thumb">
                              <img
                                src={w.imageData}
                                alt={w.title}
                              />
                            </div>
                          )}
                          <div className="portfolio-work-text">
                            <div className="work-title">
                              {w.title}
                            </div>
                            <div className="work-meta-line">
                              {w.project && <span>{w.project}</span>}
                              {w.project && w.year && <span> · </span>}
                              {w.year && <span>{w.year}</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="small-pill-btn"
                            onClick={() =>
                              handleAddWorkToCurrent(w.id)
                            }
                          >
                            Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="portfolio-column">
                  <h3>Selected works (order & text)</h3>
                  <p className="hint-text">
                    순서를 조정하고, 이 포트폴리오에서만
                    사용할 제목과 설명을 적을 수 있습니다.
                    비워두면 원래 작품 정보를 사용합니다.
                  </p>
                  <div className="portfolio-work-list">
                    {itemsWithWork.length === 0 ? (
                      <p className="hint-text">
                        아직 선택된 작품이 없습니다.
                      </p>
                    ) : (
                      itemsWithWork.map(({ item, work }) =>
                        !work ? null : (
                          <div
                            key={item.workId}
                            className="portfolio-work-card"
                          >
                            {work.imageData && (
                              <div className="portfolio-work-thumb">
                                <img
                                  src={work.imageData}
                                  alt={work.title}
                                />
                              </div>
                            )}
                            <div className="portfolio-work-text">
                              <div className="work-title">
                                {work.title}
                              </div>
                              <div className="work-meta-line">
                                순서 {item.order}
                              </div>
                              <label>
                                <span>Custom title</span>
                                <input
                                  type="text"
                                  value={
                                    item.customTitle ?? ""
                                  }
                                  onChange={(
                                    e: ChangeEvent<HTMLInputElement>
                                  ) =>
                                    handleItemCustomChange(
                                      item.workId,
                                      "customTitle",
                                      e.target.value
                                    )
                                  }
                                  placeholder="비워두면 원래 제목 사용"
                                />
                              </label>
                              <label>
                                <span>Custom description</span>
                                <textarea
                                  rows={2}
                                  value={
                                    item.customDescription ??
                                    ""
                                  }
                                  onChange={(
                                    e: ChangeEvent<HTMLTextAreaElement>
                                  ) =>
                                    handleItemCustomChange(
                                      item.workId,
                                      "customDescription",
                                      e.target.value
                                    )
                                  }
                                  placeholder="비워두면 원래 메모/설명 사용"
                                />
                              </label>
                              <div className="work-actions">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMoveItem(
                                      item.workId,
                                      "up"
                                    )
                                  }
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMoveItem(
                                      item.workId,
                                      "down"
                                    )
                                  }
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveWorkFromCurrent(
                                      item.workId
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>

                <div className="portfolio-column">
                  <h3>Preview</h3>
                  <p className="hint-text">
                    실제 제출용 포트폴리오에서 보이는 순서와
                    텍스트를 미리 볼 수 있습니다.
                  </p>
                  <div className="portfolio-preview">
                    <h4>
                      {current.title}{" "}
                      {current.year && <span>({current.year})</span>}
                    </h4>
                    {current.targetSchool && (
                      <p>
                        {current.targetSchool}
                        {current.targetMajor && (
                          <>
                            {" "}
                            · {current.targetMajor}
                          </>
                        )}
                      </p>
                    )}
                    <ol className="portfolio-preview-list">
                      {itemsWithWork.map(({ item, work }) => {
                        if (!work) return null;
                        const effectiveTitle =
                          (item.customTitle &&
                            item.customTitle.trim()) ||
                          work.title;
                        const effectiveDesc =
                          (item.customDescription &&
                            item.customDescription.trim()) ||
                          work.description ||
                          "";
                        return (
                          <li
                            key={item.workId}
                            className="portfolio-preview-item"
                          >
                            {work.imageData && (
                              <div className="preview-thumb">
                                <img
                                  src={work.imageData}
                                  alt={effectiveTitle}
                                />
                              </div>
                            )}
                            <div className="preview-text">
                              <div className="preview-title">
                                {item.order}. {effectiveTitle}
                              </div>
                              {effectiveDesc && (
                                <div className="preview-desc">
                                  {effectiveDesc}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
