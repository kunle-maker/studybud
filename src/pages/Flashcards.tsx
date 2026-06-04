import { useState } from "react";
import api from "@/lib/api";
import LimitBanner from "@/components/LimitBanner";

interface Flashcard {
  front: string;
  back: string;
}

export default function Flashcards() {
  const [text, setText] = useState("");
  const [count, setCount] = useState(10);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 10) { setError("Please enter at least 10 characters."); return; }
    setError(""); setLimitReached(false); setCards([]); setCurrent(0); setFlipped(false);
    setLoading(true);
    try {
      const { data } = await api.post("/study-tools/flashcards", { text, count });
      setCards(data.data.flashcards);
    } catch (err: any) {
      if (err?.response?.data?.limitReached) setLimitReached(true);
      else setError(err?.response?.data?.message || "Failed to generate flashcards.");
    } finally {
      setLoading(false);
    }
  };

  const next = () => { setCurrent(p => Math.min(p + 1, cards.length - 1)); setFlipped(false); };
  const prev = () => { setCurrent(p => Math.max(p - 1, 0)); setFlipped(false); };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Flashcards</h1>
        <p className="text-muted-foreground text-sm mt-1">Paste study material and generate interactive AI flashcards to quiz yourself.</p>
      </div>

      {limitReached && <LimitBanner feature="flashcards" />}

      {cards.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Study Material
                <span className="ml-2 font-normal normal-case text-muted-foreground/70">{text.length}/5000 chars</span>
              </label>
              <textarea
                data-testid="input-text"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 5000))}
                rows={7}
                placeholder="Paste your notes, textbook passages, or any content you want to study…"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
              />
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Number of cards</label>
                <select
                  data-testid="select-count"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                >
                  {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} cards</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-destructive flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation" />{error}</p>}

            <button
              data-testid="btn-generate"
              type="submit"
              disabled={loading || text.trim().length < 10}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm"
              style={{ background: "hsl(217 91% 48%)" }}
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating cards…</>
              ) : (
                <><i className="fa-solid fa-cards-blank" />Generate Flashcards</>
              )}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Flashcard viewer */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Card {current + 1} of {cards.length}</p>
            <div className="w-full max-w-lg mx-auto h-52 [perspective:1200px] cursor-pointer" onClick={() => setFlipped(!flipped)}>
              <div className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
                {/* Front */}
                <div className="absolute inset-0 bg-card border-2 border-primary/30 rounded-2xl flex flex-col items-center justify-center p-8 [backface-visibility:hidden] shadow-md">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">Question</span>
                  <p className="text-foreground font-semibold text-center text-base leading-relaxed">{cards[current]?.front}</p>
                  <span className="absolute bottom-4 text-xs text-muted-foreground flex items-center gap-1">
                    <i className="fa-solid fa-rotate" />tap to flip
                  </span>
                </div>
                {/* Back */}
                <div className="absolute inset-0 bg-primary rounded-2xl flex flex-col items-center justify-center p-8 [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-md">
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Answer</span>
                  <p className="text-white font-medium text-center text-base leading-relaxed">{cards[current]?.back}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button data-testid="btn-prev" onClick={prev} disabled={current === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-all">
                <i className="fa-solid fa-chevron-left" />Prev
              </button>
              <div className="flex gap-1.5">
                {cards.map((_, i) => (
                  <button key={i} onClick={() => { setCurrent(i); setFlipped(false); }}
                    className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-primary scale-125" : "bg-border hover:bg-muted-foreground"}`} />
                ))}
              </div>
              <button data-testid="btn-next" onClick={next} disabled={current === cards.length - 1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-all">
                Next<i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          </div>

          {/* All cards list */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">All Cards ({cards.length})</h2>
              <button data-testid="btn-new-cards" onClick={() => setCards([])}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <i className="fa-solid fa-plus" />New set
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {cards.map((card, i) => (
                <div key={i} data-testid={`flashcard-${i}`}
                  onClick={() => { setCurrent(i); setFlipped(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${i === current ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/30"}`}>
                  <p className="text-xs font-semibold text-primary mb-1">Q:</p>
                  <p className="text-sm text-foreground">{card.front}</p>
                  <p className="text-xs font-semibold text-muted-foreground mt-2 mb-1">A:</p>
                  <p className="text-sm text-muted-foreground">{card.back}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
