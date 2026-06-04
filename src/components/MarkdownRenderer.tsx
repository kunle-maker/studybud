import React from "react";

function parseInline(text: string): React.ReactNode {
  const result: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|`(.+?)`/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) result.push(text.slice(last, m.index));
    if (m[1]) result.push(<strong key={key++} className="font-semibold">{m[1]}</strong>);
    else if (m[2]) result.push(<em key={key++}>{m[2]}</em>);
    else if (m[3]) result.push(<em key={key++}>{m[3]}</em>);
    else if (m[4]) result.push(
      <code key={key++}
        className="px-1.5 py-0.5 rounded-md font-mono text-xs"
        style={{ background: "rgba(255,255,255,0.12)", color: "inherit" }}>
        {m[4]}
      </code>
    );
    last = m.index + m[0].length;
  }

  if (last < text.length) result.push(text.slice(last));
  return result.length === 1 ? result[0] : <>{result}</>;
}

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p";   text: string }
  | { type: "ul";  items: string[] }
  | { type: "ol";  items: string[] }
  | { type: "code"; content: string }
  | { type: "hr" };

function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      blocks.push({ type: "code", content: code.join("\n") });
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4) }); i++; continue; }
    if (line.startsWith("## "))  { blocks.push({ type: "h2", text: line.slice(3) }); i++; continue; }
    if (line.startsWith("# "))   { blocks.push({ type: "h1", text: line.slice(2) }); i++; continue; }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { blocks.push({ type: "hr" }); i++; continue; }

    // Unordered list
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Skip blank lines
    if (line.trim() === "") { i++; continue; }

    // Paragraph — accumulate until a blank line or a block-level marker
    const paras: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,3} |[-*] |\d+\. |---+$|```)/.test(lines[i])
    ) {
      paras.push(lines[i]);
      i++;
    }
    if (paras.length) blocks.push({ type: "p", text: paras.join("\n") });
  }

  return blocks;
}

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
          case "h1":
            return <h1 key={i} className="text-base font-bold mt-3 mb-0.5">{parseInline(block.text)}</h1>;
          case "h2":
            return <h2 key={i} className="text-sm font-bold mt-2 mb-0.5">{parseInline(block.text)}</h2>;
          case "h3":
            return <h3 key={i} className="text-sm font-semibold mt-1.5 mb-0.5 opacity-90">{parseInline(block.text)}</h3>;
          case "hr":
            return <hr key={i} className="border-white/15 my-2" />;
          case "code":
            return (
              <pre key={i}
                className="rounded-xl px-4 py-3 overflow-x-auto text-xs font-mono leading-relaxed"
                style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <code>{block.content}</code>
              </pre>
            );
          case "ul":
            return (
              <ul key={i} className="space-y-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="text-primary mt-[5px] text-[10px] flex-shrink-0">●</span>
                    <span>{parseInline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="space-y-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="text-primary font-bold text-xs mt-0.5 w-5 flex-shrink-0">{j + 1}.</span>
                    <span>{parseInline(item)}</span>
                  </li>
                ))}
              </ol>
            );
          case "p":
            return <p key={i} className="whitespace-pre-wrap">{parseInline(block.text)}</p>;
          default:
            return null;
        }
      })}
    </div>
  );
}
