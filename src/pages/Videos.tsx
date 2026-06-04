import { useState } from "react";
import api from "@/lib/api";

interface Video {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
}

export default function Videos() {
  const [topic, setTopic] = useState("");
  const [maxResults, setMaxResults] = useState(5);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setError(""); setVideos([]); setActiveVideo(null);
    setLoading(true);
    try {
      const { data } = await api.get("/videos/search", { params: { topic, maxResults } });
      setVideos(data.data.videos);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Video search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ["Photosynthesis", "World War 2", "Quantum physics", "JavaScript async/await", "Human anatomy"];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">YouTube Video Search</h1>
        <p className="text-muted-foreground text-sm mt-1">Find the best educational YouTube videos for any topic.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Search Topic</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <i className="fa-brands fa-youtube absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500 text-sm pointer-events-none" />
                <input
                  data-testid="input-topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, World War 2, Calculus derivatives…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>
              <select
                data-testid="select-max"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              >
                {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n} videos</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button key={s} type="button" onClick={() => setTopic(s)}
                className="px-3 py-1 rounded-xl text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/70 border border-accent-foreground/10 transition-colors">
                {s}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-destructive flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation" />{error}</p>}

          <button
            data-testid="btn-search"
            type="submit"
            disabled={loading || !topic.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm"
            style={{ background: "hsl(217 91% 48%)" }}
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Searching…</>
            ) : (
              <><i className="fa-solid fa-magnifying-glass" />Search Videos</>
            )}
          </button>
        </form>
      </div>

      {/* Active video embed */}
      {activeVideo && (
        <div data-testid="video-embed" className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <div className="p-3 flex justify-end">
            <button onClick={() => setActiveVideo(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
              <i className="fa-solid fa-xmark" />Close player
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {videos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{videos.length} videos found for "{topic}"</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {videos.map((video, i) => (
              <div key={video.videoId} data-testid={`video-card-${i}`}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer"
                onClick={() => setActiveVideo(activeVideo === video.videoId ? null : video.videoId)}>
                <div className="relative aspect-video">
                  <img src={video.thumbnail} alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <i className="fa-solid fa-play text-red-600 text-sm ml-0.5" />
                    </div>
                  </div>
                  {activeVideo === video.videoId && (
                    <div className="absolute top-2 right-2 bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full">Playing</div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{video.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <i className="fa-brands fa-youtube text-red-500 text-xs" />
                    <span className="text-xs text-muted-foreground truncate">{video.channelTitle}</span>
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                      {new Date(video.publishedAt).getFullYear()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {videos.length === 0 && !loading && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <i className="fa-brands fa-youtube text-5xl mb-4 opacity-20 block" />
          <p className="font-semibold text-foreground">Search for educational videos</p>
          <p className="text-sm mt-1">Enter any topic to find relevant YouTube lessons</p>
        </div>
      )}
    </div>
  );
}
