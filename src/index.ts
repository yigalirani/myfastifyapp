import Fastify,{FastifyInstance,} from 'fastify'
import {DB} from './autogen/database'
import varlog from "varlog"
import * as utils from './utils'
import {print_body} from './render_page'
import { z } from "zod";
import { marked } from 'marked'
const config_schema = z.object({
  connectionString: z.string(),
  connection:z.object({
    database: z.string(),
    host: z.string(),
    user: z.string(),
    password: z.string(),
    port: z.number(),
    connectionLimit: z.number()
  })
});
/**
 * Converts Textile markup to Markdown format
 * @param textile - The Textile string to convert
 * @returns The converted Markdown string
 */
/**
 * Converts Textile markup to Markdown format
 * @param textile - The Textile string to convert
 * @returns The converted Markdown string
 */
function textileToMarkdown(textile: string): string {
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
  markdown = markdown.replace(/^\|(.+)\|$/gm, (match, content) => {
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



export default textileToMarkdown;
async function build_server(app:FastifyInstance){
  const {connection}= utils.read_zod('./config.json',config_schema)
  const db=utils.mysql_pool<DB>(connection)

  app.get<{Params: {page: string}}>(
    '/:page(.*).htm', async function handler (request, reply) {
    const { page } = request.params;
    const post=await db.selectFrom('mc_post').where('post_name','=',page).selectAll().executeTakeFirst()
    const content=await async function(){
      if (post==null)
        return print_body({body:'page not found'})
      const markdown=textileToMarkdown(post.post_content)
      const body=await marked(markdown)
      return print_body({...post,body})
    }()
    reply.type('text/html').send(content)
  })
}
async function bootstap(){
  const app = Fastify({logger: true})
  await build_server(app)
  app.listen({ port: 3000 })
}
bootstap()