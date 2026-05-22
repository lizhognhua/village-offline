"use client";
import { Pencil, Trash2, Download, ExternalLink } from "lucide-react";

interface RecordCardProps {
  record: any;
  onEdit: (r: any) => void;
  onDelete: (id: string) => void;
}

export default function RecordCard({ record, onEdit, onDelete }: RecordCardProps) {
  const photos: string[] = (() => { try { return JSON.parse(record.photos || "[]"); } catch { return []; } })();
  const files: any[] = (() => { try { return JSON.parse(record.files || "[]"); } catch { return []; } })();
  const urls: string[] = (() => { try { return JSON.parse(record.urls || "[]"); } catch { return []; } })();

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 14,
      border: "1px solid rgba(255,255,255,0.06)", position: "relative",
    }}>
      <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 4 }}>
        <button onClick={() => onEdit(record)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5a4a5a", padding: 2 }}>
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(record.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5a4a5a", padding: 2 }}>
          <Trash2 size={13} />
        </button>
      </div>

      <h4 style={{ color: "#e0d0c0", fontSize: "0.88rem", fontWeight: 600, margin: "0 40px 4px 0" }}>{record.title}</h4>
      <div style={{ fontSize: "0.68rem", color: "#5a4a5a", marginBottom: 8 }}>
        {new Date(record.date).toLocaleDateString("zh-CN")}
      </div>

      {record.description && (
        <p style={{ color: "#847b8a", fontSize: "0.72rem", lineHeight: 1.5, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {record.description}
        </p>
      )}

      {photos.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {photos.slice(0, 4).map((url: string, i: number) => (
            <img key={i} src={url.startsWith("/uploads/") ? url.replace("/uploads/", "/api/uploads/") : url}
              alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)" }} />
          ))}
          {photos.length > 4 && <span style={{ fontSize: "0.65rem", color: "#5a4a5a", alignSelf: "center" }}>+{photos.length - 4}</span>}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {files.map((f: any, i: number) => (
          <a key={i} href={f.downloadUrl || "#"} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "0.62rem", padding: "2px 8px", borderRadius: 10, background: "rgba(99,102,241,0.12)", color: "#818cf8", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
            <Download size={10} /> {f.fileName || f.title || "附件"}
          </a>
        ))}
        {urls.map((url: string, i: number) => (
          <a key={`u${i}`} href={url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "0.62rem", padding: "2px 8px", borderRadius: 10, background: "rgba(217,119,6,0.12)", color: "#d97706", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
            <ExternalLink size={10} /> 链接{i + 1}
          </a>
        ))}
      </div>
    </div>
  );
}
