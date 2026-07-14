import { useState, useRef } from "react";
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

function VideoSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-3.5 bg-muted rounded w-full" />
        <div className="h-3.5 bg-muted rounded w-3/4" />
        <div className="flex gap-2 mt-3">
          <div className="h-3 bg-muted rounded w-4" />
          <div className="h-3 bg-muted rounded w-28" />
          <div className="h-3 bg-muted rounded w-10 ml-auto" />
        </div>
      </div>
    </div>
  );
}

export default function Videos() {
  const [topic, setTopic]           = useState("");
  const [maxResults, setMaxResults] = useState(6);
  const [videos, setVideos]         = useState<Video[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [lastQuery, setLastQuery]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e?: React.FormEvent, overrideTopic?: string) => {
    e?.preventDefault();
    const q = overrideTopic ?? topic;
    if (!q.trim()) return;
    setError("");
    setVideos([]);
    setActiveVideo(null);
    setLoading(true);
    setLastQuery(q.trim());
    try {
      const { data } = await api.get("/videos/search", { params: { topic: q.trim(), maxResults } });
      const results = data.data?.videos || [];
      if (results.length === 0) {
        setError("No educational videos found for this topic. Try a different search term.");
      }
      setVideos(results);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => handleSearch(undefined, lastQuery);

  const suggestions = [
    "Photosynthesis explained",
    "World War 2 history",
    "Quantum physics lecture",
    "JavaScript async/await tutorial",
    "Human anatomy",
    "Machine learning basics",
    "French Revolution",
    "Organic chemistry reactions",
  ];

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <i className="fa-brands fa-youtube text-red-500 text-sm" />
            </span>
            Educational Videos
          </h1>
          <p className="text-muted-foreground text-sm mt-1 ml-0.5">
            AI-curated YouTube videos filtered for educational content — lectures, tutorials, and lessons.
          </p>
        </div>
      </div>

      {/* Search panel */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Search Topic</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <i className="fa-brands fa-youtube absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500 text-sm pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, Calculus derivatives, World War 2…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all flex-shrink-0"
              >
                {[3, 6, 9, 12].map(n => <option key={n} value={n}>{n} videos</option>)}
              </select>
            </div>
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setTopic(s);
                  handleSearch(undefined, s);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm bg-primary hover:bg-primary/90"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Searching…</>
              : <><i className="fa-solid fa-magnifying-glass" />Search Videos</>}
          </button>
        </form>

        {/* Educational filter note */}
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <i className="fa-solid fa-shield-halved text-primary/70" />
          Results are filtered for educational value — lectures, tutorials, university content prioritised.
        </p>
      </div>

      {/* Active video embed */}
      {activeVideo && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <i className="fa-brands fa-youtube text-red-500 mr-1.5" />
              Now Playing
            </p>
            <button
              onClick={() => setActiveVideo(null)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <i className="fa-solid fa-xmark" />Close player
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive">
          <i className="fa-solid fa-circle-exclamation flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{error}</p>
          </div>
          {lastQuery && (
            <button
              onClick={handleRetry}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-destructive/15 hover:bg-destructive/25 transition-all flex-shrink-0"
            >
              <i className="fa-solid fa-rotate-right text-[10px]" />Retry
            </button>
          )}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Searching for educational videos…</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: maxResults }).map((_, i) => <VideoSkeleton key={i} />)}
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && videos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {videos.length} educational videos for "{lastQuery}"
            </p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <i className="fa-solid fa-rotate-right text-[10px]" />Refresh results
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <div
                key={video.videoId}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 transition-all group cursor-pointer"
                onClick={() => setActiveVideo(activeVideo === video.videoId ? null : video.videoId)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <i className="fa-brands fa-youtube text-muted-foreground text-3xl" />
                    </div>
                  )}
                  {/* Hover play overlay */}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <i className="fa-solid fa-play text-red-600 text-sm ml-0.5" />
                    </div>
                  </div>
                  {/* Playing badge */}
                  {activeVideo === video.videoId && (
                    <div className="absolute top-2 right-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Playing
                    </div>
                  )}
                  {/* Duration placeholder (YouTube API doesn't return duration in search) */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    <i className="fa-brands fa-youtube mr-1" />
                    YouTube
                  </div>
                </div>

                {/* Info */}
                <div className="p-3.5 space-y-2">
                  <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                    {video.title}
                  </p>
                  {video.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {video.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-0.5">
                    <i className="fa-brands fa-youtube text-red-500 text-xs flex-shrink-0" />
                    <span className="text-xs text-muted-foreground truncate flex-1">{video.channelTitle}</span>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">
                      {new Date(video.publishedAt).getFullYear()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && videos.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
            <i className="fa-brands fa-youtube text-red-500/50 text-4xl" />
          </div>
          <p className="text-base font-semibold text-foreground">Search for educational videos</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
            Enter any topic to find curated YouTube lectures, tutorials, and lessons — entertainment filtered out.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {suggestions.slice(0, 4).map(s => (
              <button
                key={s}
                onClick={() => {
                  setTopic(s);
                  handleSearch(undefined, s);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
