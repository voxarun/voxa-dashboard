"use client";

import { useEffect, useRef, useState } from "react";

const LS_KEY = "voxa-drivers";
const DRIVERS_CHANGED_EVENT = "voxa-drivers-changed";

const STATUS_OPTIONS = ["En Route", "Pickup", "Available"] as const;
const STATUS_CLASS: Record<string, string> = { "En Route": "ca", Pickup: "cn", Available: "cd" };
// One colour per status, shared by the moving map dot and the legend swatch.
const STATUS_COLOR: Record<string, string> = {
  "En Route": "#ffab00", // amber
  Pickup: "#0094ff", // blue
  Available: "#00e676", // green
};
const colorOf = (status: string) => STATUS_COLOR[status] ?? "#00e676";

type Driver = {
  name: string;
  carModel: string;
  plate: string;
  status: string;
  job: string;
  eta: string;
};

const BLANK_DRIVER: Driver = { name: "", carModel: "", plate: "", status: "Available", job: "", eta: "" };

const initialOf = (name: string) => name.trim().charAt(0).toUpperCase() || "?";
const statusClassOf = (status: string) => STATUS_CLASS[status] ?? "cd";

const fieldStyle: React.CSSProperties = {
  background: "var(--s2)",
  border: "1px solid var(--b1)",
  borderRadius: 7,
  padding: "7px 9px",
  fontSize: 12,
  color: "var(--t1)",
  width: "100%",
};
const editLabelStyle: React.CSSProperties = { fontSize: 10, color: "var(--t2)" };

function DriverForm({
  draft,
  onField,
  onCancel,
  onSave,
  saveLabel,
}: {
  draft: Driver;
  onField: (key: keyof Driver, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <div className="driver-card">
      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={editLabelStyle}>Driver Name</span>
          <input type="text" value={draft.name} onChange={(e) => onField("name", e.target.value)} style={fieldStyle} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={editLabelStyle}>Car Model</span>
          <input type="text" value={draft.carModel} onChange={(e) => onField("carModel", e.target.value)} style={fieldStyle} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={editLabelStyle}>License Plate</span>
          <input type="text" value={draft.plate} onChange={(e) => onField("plate", e.target.value)} style={fieldStyle} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={editLabelStyle}>Status</span>
          <select value={draft.status} onChange={(e) => onField("status", e.target.value)} style={fieldStyle}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} style={{ background: "#080c16", color: "var(--t1)" }}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={editLabelStyle}>Current Job description</span>
          <input
            type="text"
            value={draft.job}
            placeholder="e.g. City Centre → Airport"
            onChange={(e) => onField("job", e.target.value)}
            style={fieldStyle}
          />
        </label>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 2 }}>
          <button type="button" className="dc-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="dc-btn done" onClick={onSave} disabled={!draft.name.trim()}>
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FleetSection({ cityLabel }: { cityLabel: string }) {
  const [list, setList] = useState<Driver[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Driver | null>(null);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<Driver>(BLANK_DRIVER);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setList(parsed as Driver[]);
      }
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  // Moving dots — one per driver, drifting across the map and coloured by
  // status. There's no real GPS in the schema, so the motion is simulated (each
  // dot has its own gentle velocity and bounces off the edges), the same way the
  // reference build does it. Runs client-side only, capped at ~30fps.
  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0,
      H = 0,
      raf = 0,
      last = 0;

    // Seed a dot per driver. Deterministic-ish spread so they don't all stack.
    const dots = list.map((d, i) => {
      const gx = ((i * 0.37 + 0.15) % 1) * 0.8 + 0.1;
      const gy = ((i * 0.61 + 0.35) % 1) * 0.7 + 0.15;
      const ang = i * 2.4;
      return { fx: gx, fy: gy, vx: Math.cos(ang) * 0.018, vy: Math.sin(ang) * 0.018, color: colorOf(d.status) };
    });

    function size() {
      W = canvas!.width = host!.offsetWidth;
      H = canvas!.height = host!.offsetHeight;
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return; // ~30fps
      const dt = Math.min(2, (now - last) / 16.67);
      last = now;

      ctx!.clearRect(0, 0, W, H);
      const SPEED = 0.05; // higher = faster drift across the map
      for (const p of dots) {
        p.fx += p.vx * SPEED * dt;
        p.fy += p.vy * SPEED * dt;
        // Bounce inside the padded area.
        if (p.fx < 0.06 || p.fx > 0.94) p.vx *= -1;
        if (p.fy < 0.1 || p.fy > 0.9) p.vy *= -1;
        p.fx = Math.max(0.06, Math.min(0.94, p.fx));
        p.fy = Math.max(0.1, Math.min(0.9, p.fy));

        const x = p.fx * W;
        const y = p.fy * H;
        // Soft outer ring
        ctx!.beginPath();
        ctx!.arc(x, y, 12, 0, Math.PI * 2);
        ctx!.fillStyle = p.color + "22";
        ctx!.fill();
        // Glow + core
        ctx!.beginPath();
        ctx!.arc(x, y, 6, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.shadowColor = p.color;
        ctx!.shadowBlur = 12;
        ctx!.fill();
        ctx!.shadowBlur = 0;
      }
    }

    size();
    const ro = new ResizeObserver(size);
    ro.observe(host);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // Re-seed when the roster or any status changes.
  }, [list]);

  function persist(next: Driver[]) {
    setList(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
    try {
      window.dispatchEvent(new Event(DRIVERS_CHANGED_EVENT));
    } catch {
      /* no-op */
    }
  }

  function startEdit(i: number) {
    setAdding(false);
    setEditing(i);
    setDraft({ ...list[i] });
  }
  function cancelEdit() {
    setEditing(null);
    setDraft(null);
  }
  function saveEdit() {
    if (draft === null || editing === null) return;
    persist(list.map((d, j) => (j === editing ? draft : d)));
    setEditing(null);
    setDraft(null);
  }
  function deleteDriver(i: number) {
    persist(list.filter((_, j) => j !== i));
    if (editing === i) cancelEdit();
  }
  function startAdd() {
    setEditing(null);
    setDraft(null);
    setAddDraft(BLANK_DRIVER);
    setAdding(true);
  }
  function cancelAdd() {
    setAdding(false);
    setAddDraft(BLANK_DRIVER);
  }
  function saveAdd() {
    if (!addDraft.name.trim()) return;
    persist([...list, addDraft]);
    setAdding(false);
    setAddDraft(BLANK_DRIVER);
  }

  const setDraftField = (key: keyof Driver, value: string) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  const setAddField = (key: keyof Driver, value: string) => setAddDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="fleet-section" id="fleet">
      <div className="fleet-grid">
        <div className="card">
          <div className="ch">
            <div>
              <div className="ct">Fleet Live View</div>
              <div className="cs">{cityLabel} · manually tracked</div>
            </div>
            <span className="badge g">{list.length} Active</span>
          </div>
          <div className="map-sim">
            <div className="map-grid" />
            <div className="road-h" style={{ top: "30%" }} />
            <div className="road-h" style={{ top: "62%" }} />
            <div className="road-v" style={{ left: "22%" }} />
            <div className="road-v" style={{ left: "55%" }} />
            <div className="road-v" style={{ left: "78%" }} />
            {/* One moving dot per driver, coloured by status. */}
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
            {list.length === 0 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "var(--t3)",
                }}
              >
                No drivers added yet
              </div>
            )}
            <div className="map-label">{cityLabel.toUpperCase()}</div>
          </div>
          <div className="map-legend">
            {list.map((d, i) => (
              <div key={i} className="ml-item">
                <div className="ml-dot" style={{ background: colorOf(d.status) }} />
                {d.name} · {d.status}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="ch">
            <div>
              <div className="ct">Driver Status</div>
              <div className="cs">Manually managed</div>
            </div>
            <span className="badge a">{list.length} On Duty</span>
          </div>

          {!adding && (
            <button type="button" className="btn p" style={{ width: "100%", marginBottom: 10 }} onClick={startAdd}>
              + Add Driver
            </button>
          )}

          <div className="driver-list">
            {adding && (
              <DriverForm draft={addDraft} onField={setAddField} onCancel={cancelAdd} onSave={saveAdd} saveLabel="Add" />
            )}
            {list.length === 0 && !adding && (
              <div style={{ fontSize: 12, color: "var(--t3)" }}>No drivers added yet — add your fleet above.</div>
            )}
            {list.map((d, i) =>
              editing === i && draft ? (
                <DriverForm key={i} draft={draft} onField={setDraftField} onCancel={cancelEdit} onSave={saveEdit} saveLabel="Save" />
              ) : (
                <div key={i} className="driver-card">
                  <div className="dc-top">
                    <div className="dc-avatar">{initialOf(d.name)}</div>
                    <div>
                      <div className="dc-name">{d.name}</div>
                      <div className="dc-vehicle">{[d.carModel, d.plate].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="dc-status">
                      <span className={`chip ${statusClassOf(d.status)}`}>{d.status}</span>
                    </div>
                  </div>
                  {d.job && <div className="dc-route">{d.job}</div>}
                  <div className="dc-foot">
                    <div className="dc-eta">{d.eta}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" className="dc-btn assign" onClick={() => startEdit(i)}>
                        Edit
                      </button>
                      <button type="button" className="dc-btn" onClick={() => deleteDriver(i)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
