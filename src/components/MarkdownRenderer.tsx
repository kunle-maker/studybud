import React from "react";

// ── Inline parser ─────────────────────────────────────────────────────────────

function parseInline(text: string): React.ReactNode {
  const result: React.ReactNode[] = [];
  // Order matters: bold before italic
  const regex = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|~~(.+?)~~|`(.+?)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) result.push(text.slice(last, m.index));
    if (m[1]) result.push(<strong key={key++}><em>{m[1]}</em></strong>);
    else if (m[2]) result.push(<strong key={key++} className="font-semibold">{m[2]}</strong>);
    else if (m[3]) result.push(<em key={key++}>{m[3]}</em>);
    else if (m[4]) result.push(<em key={key++}>{m[4]}</em>);
    else if (m[5]) result.push(<del key={key++} className="line-through opacity-60">{m[5]}</del>);
    else if (m[6]) result.push(
      <code key={key++}
        className="px-1.5 py-0.5 rounded-md font-mono text-[0.8em]"
        style={{ background: "rgba(127,127,127,0.15)", color: "inherit" }}>
        {m[6]}
      </code>
    );
    else if (m[7] && m[8]) result.push(
      <a key={key++} href={m[8]} target="_blank" rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-80">
        {m[7]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) result.push(text.slice(last));
  return result.length === 1 ? result[0] : <>{result}</>;
}

// ── Block types ───────────────────────────────────────────────────────────────

type Block =
  | { type: "h1" | "h2" | "h3" | "h4"; text: string }
  | { type: "p";   text: string }
  | { type: "ul";  items: string[]; ordered: false }
  | { type: "ol";  items: string[]; ordered: true }
  | { type: "code"; lang: string; content: string }
  | { type: "blockquote"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" };

// ── Block parser ──────────────────────────────────────────────────────────────

function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      blocks.push({ type: "code", lang, content: code.join("\n") });
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("#### ")) { blocks.push({ type: "h4", text: line.slice(5) }); i++; continue; }
    if (line.startsWith("### "))  { blocks.push({ type: "h3", text: line.slice(4) }); i++; continue; }
    if (line.startsWith("## "))   { blocks.push({ type: "h2", text: line.slice(3) }); i++; continue; }
    if (line.startsWith("# "))    { blocks.push({ type: "h1", text: line.slice(2) }); i++; continue; }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) { blocks.push({ type: "hr" }); i++; continue; }

    // Blockquote
    if (line.startsWith("> ")) {
      const bqLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        bqLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: "blockquote", text: bqLines.join("\n") });
      continue;
    }

    // Table (|---|---|)
    if (line.includes("|") && i + 1 < lines.length && /\|[-: ]+\|/.test(lines[i + 1])) {
      const headers = line.split("|").map(c => c.trim()).filter(Boolean);
      i += 2; // skip separator row
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").map(c => c.trim()).filter(Boolean));
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // Unordered list
    if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+] /, ""));
        i++;
      }
      blocks.push({ type: "ul", items, ordered: false });
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      blocks.push({ type: "ol", items, ordered: true });
      continue;
    }

    // Skip blank lines
    if (line.trim() === "") { i++; continue; }

    // Paragraph
    const paras: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,4} |[-*+] |\d+\. |[-*_]{3,}$|```|> |\|)/.test(lines[i])
    ) {
      paras.push(lines[i]);
      i++;
    }
    if (paras.length) blocks.push({ type: "p", text: paras.join("\n") });
  }

  return blocks;
}

// ── Renderer ──────────────────────────────────────────────────────────────────

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: Props) {
  const blocks = parseBlocks(content);

  return (
    <div className={`space-y-2 text-sm leading-relaxed ${className}`}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h1": return <h1 key={i} className="text-base font-bold mt-4 mb-1 text-foreground">{parseInline(block.text)}</h1>;
          case "h2": return <h2 key={i} className="text-sm font-bold mt-3 mb-0.5 text-foreground">{parseInline(block.text)}</h2>;
          case "h3": return <h3 key={i} className="text-sm font-semibold mt-2 mb-0.5 text-foreground/90">{parseInline(block.text)}</h3>;
          case "h4": return <h4 key={i} className="text-xs font-semibold mt-1.5 uppercase tracking-wide text-muted-foreground">{parseInline(block.text)}</h4>;

          case "hr": return <hr key={i} className="border-border my-3" />;

          case "blockquote": return (
            <blockquote key={i} className="border-l-2 border-primary/40 pl-3 py-0.5 text-muted-foreground italic">
              <MarkdownRenderer content={block.text} />
            </blockquote>
          );

          case "p": return (
            <p key={i} className="text-foreground/90 whitespace-pre-wrap">
              {parseInline(block.text)}
            </p>
          );

          case "ul": return (
            <ul key={i} className="space-y-1 pl-4 list-none">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-foreground/90">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
                  <span>{parseInline(item)}</span>
                </li>
              ))}
            </ul>
          );

          case "ol": return (
            <ol key={i} className="space-y-1 pl-4 list-none counter-reset">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-foreground/90">
                  <span className="text-primary/70 font-mono text-xs mt-0.5 flex-shrink-0 w-4">{j + 1}.</span>
                  <span>{parseInline(item)}</span>
                </li>
              ))}
            </ol>
          );

          case "code": return (
            <div key={i} className="rounded-xl overflow-hidden border border-border">
              {block.lang && (
                <div className="px-3 py-1.5 text-[10px] font-mono font-semibold text-muted-foreground border-b border-border"
                  style={{ background: "rgba(127,127,127,0.07)" }}>
                  {block.lang}
                </div>
              )}
              <pre className="p-3 overflow-x-auto text-xs font-mono text-foreground/90 leading-relaxed"
                style={{ background: "rgba(0,0,0,0.25)" }}>
                <code>{block.content}</code>
              </pre>
            </div>
          );

          case "table": return (
            <div key={i} className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border" style={{ background: "rgba(127,127,127,0.07)" }}>
                    {block.headers.map((h, j) => (
                      <th key={j} className="px-3 py-2 text-left font-semibold text-foreground/80">{parseInline(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-2 text-foreground/80">{parseInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );

          default: return null;
        }
      })}
    </div>
  );
}
