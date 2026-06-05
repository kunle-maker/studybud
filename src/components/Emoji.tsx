interface EmojiProps {
  char: string;
  size?: number;
  className?: string;
}

function toTwemojiKey(emoji: string): string {
  const codepoints: string[] = [];
  for (let i = 0; i < emoji.length; ) {
    const cp = emoji.codePointAt(i)!;
    if (cp !== 0xfe0f) {
      codepoints.push(cp.toString(16).toLowerCase());
    }
    i += cp > 0xffff ? 2 : 1;
  }
  return codepoints.join("-");
}

export default function Emoji({ char, size = 18, className = "" }: EmojiProps) {
  const key = toTwemojiKey(char);
  return (
    <img
      src={`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${key}.svg`}
      alt={char}
      width={size}
      height={size}
      draggable={false}
      loading="lazy"
      className={`inline-block select-none ${className}`}
    />
  );
}
