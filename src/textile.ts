export function textileToMarkdown(textile: string): string { // https://claude.ai/public/artifacts/04904f93-eb57-442e-afb6-2f0354d1c679
  let markdown = textile;

  // Headers
  markdown = markdown.replace(/^h([1-6])\.\s+(.+)$/gm, (match, level, content) => `${'#'.repeat(parseInt(level,10))} ${content}`)

  // Bold text
  markdown = markdown.replace(/\*([^*]+)\*/g, '**$1**');

  // Italic text - only convert underscores surrounded by whitespace or line boundaries
  markdown = markdown.replace(/(^|\s)_([^_]+)_(\s|$)/g, '$1*$2*$3');

  // Code spans
  markdown = markdown.replace(/@([^@]+)@/g, '`$1`');

  // Strike-through - only convert ASCII hyphen-minus (U+002D) surrounded by whitespace or line boundaries
  //markdown = markdown.replace(/(^|\s)\u002D([^\u002D]+)\u002D(\s|$)/g, '$1~~$2~~$3');

  // Links - stop at punctuation that's typically not part of URLs (but allow periods and common URL chars)

  markdown = markdown.replace(/"([^"]*)":([^\s|,]+)/gm, '[$1]($2)');


  // Images
  markdown = markdown.replace(/!([^!]+)!/g, '![]($1)');
  markdown = markdown.replace(/!([^!]+)\(([^)]+)\)!/g, '![$2]($1)');

  // Lists - unordered
  markdown = markdown.replace(/^\*\s+(.+)$/gm, '- $1');
  markdown = markdown.replace(/^\*{2}\s+(.+)$/gm, '  - $1');
  markdown = markdown.replace(/^\*{3}\s+(.+)$/gm, '    - $1');

  // Lists - ordered
  markdown = markdown.replace(/^#\s+(.+)$/gm, '1. $1');
  markdown = markdown.replace(/^#{2}\s+(.+)$/gm, '  1. $1');
  markdown = markdown.replace(/^#{3}\s+(.+)$/gm, '    1. $1');

  // Block quotes
  markdown = markdown.replace(/^bq\.\s+(.+)$/gm, '> $1');

  // Code blocks
  markdown = markdown.replace(/^bc\.\s*$/gm, '```');
  markdown = markdown.replace(/^bc\.\s+(.+)$/gm, '```\n$1\n```');

  // Preformatted text
  markdown = markdown.replace(/^pre\.\s+(.+)$/gm, '```\n$1\n```');

  // Tables - basic conversion
  markdown = markdown.replace(/^\|(.+)\|$/gm, (match, content) => {
    const cells = content.split('|').map((cell: string) => cell.trim());
    return `| ${cells.join(' | ')} |`;
  });

  // Table headers (Textile |_. header |_. header | becomes Markdown header row)
  markdown = markdown.replace(/\|_\.\s*([^|]+)/g, '| $1');
  
  // Add table separator after first table row
  markdown = markdown.replace(/(^\|[^|]*\|.*$)/gm, (match, line) => {
    const cellCount = (line.match(/\|/g) || []).length - 1;
    const separator = `|${' --- |'.repeat(cellCount)}`;
    return `${line}\n${separator}`;
  });



  return markdown;
}
