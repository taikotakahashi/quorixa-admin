import { ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { uploadImage } from "../lib/supabase";
import { useToast } from "./Toast";

type Bucket = "team" | "case-studies" | "clients" | "insights";

type Props = {
  bucket: Bucket;
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
};

export function ImageField({ bucket, value, onChange, label = "Image" }: Props) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadImage(bucket, file);
      onChange(url);
      push("Image uploaded");
    } catch (err) {
      push(err instanceof Error ? err.message : "Upload failed", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field image-field">
      <span>{label}</span>
      <div className="image-preview">
        {value ? (
          <img src={value} alt="" />
        ) : (
          <div
            className="thumb-lg"
            style={{ display: "grid", placeItems: "center", color: "#94a3b8" }}
          >
            <ImagePlus size={22} />
          </div>
        )}
        <div style={{ display: "grid", gap: 8 }}>
          <label className="btn btn-sm file-btn">
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {value ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => onChange(null)}
            >
              <Trash2 size={14} /> Remove
            </button>
          ) : null}
          <p className="field-hint">WebP or PNG, ideally under 1MB.</p>
        </div>
      </div>
      <input
        className="input"
        placeholder="Or paste image URL"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </div>
  );
}
