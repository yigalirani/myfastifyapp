import { readFileSync } from 'fs';
import { ZodType } from "zod";
import { createPool,PoolOptions } from 'mysql2' 
import { Kysely, MysqlDialect, } from 'kysely'
export function read_zod<T>(filename: string, schema: ZodType<T>): T {
  const config_data = readFileSync(filename, 'utf-8');  //read sync so doent need the buildfasity pattern
  return schema.parse(JSON.parse(config_data));
}
export function mysql_pool<T>(connection:PoolOptions){
  const dialect = new MysqlDialect({
    pool: createPool(connection)
  })
  const db = new Kysely<T>({dialect})
  return db
}

export function textileToMarkdown(textile: string): string { // https://claude.ai/public/artifacts/04904f93-eb57-442e-afb6-2f0354d1c679
  let markdown = textile;

  // Headers
  markdown = markdown.replace(/^h([1-6])\.\s+(.+)$/gm, (match, level, content) => {
    return '#'.repeat(parseInt(level)) + ' ' + content;
  });

  // Bold text
  markdown = markdown.replace(/\*([^*]+)\*/g, '**$1**');

  // Italic text - only convert underscores surrounded by whitespace or line boundaries
  markdown = markdown.replace(/(^|\s)_([^_]+)_(\s|$)/g, '$1*$2*$3');

  // Code spans
  markdown = markdown.replace(/@([^@]+)@/g, '`$1`');

  // Strike-through - only convert dashes surrounded by whitespace or line boundaries
  markdown = markdown.replace(/(^|\s)-([^-]+)-(\s|$)/g, '$1~~$2~~$3');

  // Links
  markdown = markdown.replace(/"([^"]+)":([^\s]+)/g, '[$1]($2)');

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
  markdown = markdown.replace(/^\|(.+)\|$/gm, (match, content:string) => {
    const cells = content.split('|').map(cell => cell.trim());
    return '| ' + cells.join(' | ') + ' |';
  });

  // Table headers (Textile |_. header |_. header | becomes Markdown header row)
  markdown = markdown.replace(/\|_\.\s*([^|]+)/g, '| $1');
  
  // Add table separator after first table row
  markdown = markdown.replace(/(^\|[^|]*\|.*$)/gm, (match, line) => {
    const cellCount = (line.match(/\|/g) || []).length - 1;
    const separator = '|' + ' --- |'.repeat(cellCount);
    return line + '\n' + separator;
  });

  // Footnotes
  markdown = markdown.replace(/\[([0-9]+)\]/g, '[^$1]');
  markdown = markdown.replace(/^fn([0-9]+)\.\s+(.+)$/gm, '[^$1]: $2');

  // Acronyms/Abbreviations - convert to regular text (Markdown doesn't have native support)
  markdown = markdown.replace(/([A-Z]{2,})\(([^)]+)\)/g, '$1 ($2)');

  // Clean up extra whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.trim();

  return markdown;
}

