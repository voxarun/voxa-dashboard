"use client";

import { useEffect, useState } from "react";

const LS_KEY = "voxa-drivers";
const DRIVERS_CHANGED_EVENT = "voxa-drivers-changed";

const STATUS_OPTIONS = ["En Route", "Pickup", "Available"] as const;
const STATUS_CLASS: Record<string, string> = { "En Route": "ca", Pickup: "cn", Available: "cd" };

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
            {list.slice(0, 3).map((d, i) => (
              <div key={i} className="ml-item">
                <div
                  className="ml-dot"
                  style={{ background: i === 0 ? "var(--industry)" : i === 1 ? "var(--blue2)" : "var(--green)" }}
                />
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
