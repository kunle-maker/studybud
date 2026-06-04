import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import LimitBanner from "@/components/LimitBanner";

interface OCRResult {
  id: string;
  extractedText: string;
  imageUrl: string;
  charCount: number;
}

interface HistoryItem {
  _id: string;
  extractedText: string;
  imageUrl: string;
  charCount: number;
  createdAt: string;
}

export default function OCR() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/ocr/history").then(r => setHistory(r.data.data?.items ?? r.data.data ?? [])).catch(() => {});
  }, []);

  const handleFile = (f: File) => {
    if (f.size > 5 * 1024 * 1024) { setError("File too large — max 5 MB."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setError(""); setLimitReached(false); setResult(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const { data } = await api.post("/ocr/process", form, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(data.data);
      setHistory(prev => [{
        _id: data.data.id,
        extractedText: data.data.extractedText,
        imageUrl: data.data.imageUrl,
        charCount: data.data.charCount,
        createdAt: new Date().toISOString()
      }, ...prev]);
    } catch (err: any) {
      if (err?.response?.data?.limitReached) setLimitReached(true);
      else setError(err?.response?.data?.message || "OCR failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.extractedText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">OCR Scanner</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload a photo of notes, textbooks, or any printed text — AI extracts it instantly.</p>
      </div>

      {limitReached && <LimitBanner feature="OCR uploads" />}

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        {/* Upload zone */}
        <div
          data-testid="upload-zone"
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {preview ? (
            <div className="flex flex-col items-center gap-3">
              <img src={preview} alt="Preview" className="max-h-48 rounded-xl object-contain border border-border shadow-sm" />
              <p className="text-sm text-muted-foreground">{file?.name}</p>
              <span className="text-xs text-primary font-medium">Click to change image</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <i className="fa-solid fa-cloud-arrow-up text-primary text-2xl" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Click to upload or drag & drop</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP — max 5 MB</p>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation" />{error}</p>}

        {file && (
          <button
            data-testid="btn-extract"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm"
            style={{ background: "hsl(217 91% 48%)" }}
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Extracting text…</>
            ) : (
              <><i className="fa-solid fa-wand-magic-sparkles" />Extract Text</>
            )}
          </button>
        )}
      </div>

      {/* Result */}
      {result && (
        <div data-testid="ocr-result" className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(52,211,153,0.18)" }}>
                <i className="fa-solid fa-check text-emerald-400 text-xs" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Extracted Text</h2>
              <span className="text-xs text-muted-foreground">· {result.charCount} characters</span>
            </div>
            <button
              data-testid="btn-copy-ocr"
              onClick={copyText}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                copied ? "border-emerald-400/40 text-emerald-300" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <i className={`fa-${copied ? "solid fa-check" : "regular fa-copy"}`} />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="bg-muted rounded-xl p-4 max-h-60 overflow-y-auto">
            <p className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">{result.extractedText}</p>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">OCR History</h2>
        {history.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <i className="fa-solid fa-camera text-3xl mb-3 opacity-30 block" />
            <p className="text-sm">No scans yet. Upload your first image above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, i) => (
              <div key={item._id || i} data-testid={`ocr-history-${i}`} className="flex gap-3 p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-border" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-2">{item.extractedText}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(item.createdAt).toLocaleDateString()} · {item.charCount} chars</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
