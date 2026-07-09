"use client";

import { useEffect, useState } from "react";

export function Topbar({ title, notifCount = 0, avatarInitial }: { title: string; notifCount?: number; avatarInitial: string }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/London" })
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="topbar">
      <div className="tb-left">
        <span className="tb-title">{title}</span>
        <span className="live-chip">
          <span className="pulse-dot" /> LIVE
        </span>
      </div>
      <div className="tb-right">
        <span className="clock-box">{time || "—"}</span>
        <div className="tb-btn">
          🔔
          {notifCount > 0 && <span className="notif-dot">{notifCount}</span>}
        </div>
        <div className="avatar">{avatarInitial}</div>
      </div>
    </header>
  );
}
