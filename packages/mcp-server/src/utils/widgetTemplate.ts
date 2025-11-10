import { promises as fs } from 'node:fs';
import path from 'node:path';

const FALLBACK_HTML = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chappy Note Widget (Fallback)</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 1rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>Chappy Note Widget</h1>
      <p>本番ビルドが見つからないため、簡易ビューを表示しています。</p>
    </main>
  </body>
</html>`;

export async function loadWidgetTemplate(distDir: string): Promise<string> {
  try {
    const indexPath = path.join(distDir, 'index.html');
    let html = await fs.readFile(indexPath, 'utf-8');
    html = await inlineStyles(html, distDir);
    html = await inlineScripts(html, distDir);
    return html;
  } catch (error) {
    console.warn('[widget] Failed to inline widget template, falling back to placeholder:', error);
    return FALLBACK_HTML;
  }
}

async function inlineScripts(html: string, distDir: string): Promise<string> {
  const scriptRegex = /<script\b[^>]*src="([^"]+)"[^>]*><\/script>/gi;
  return replaceAsync(html, scriptRegex, async (full, src) => {
    const code = await readAsset(distDir, src);
    if (!code) return full;
    return `<script type="module">\n${code}\n<\/script>`;
  });
}

async function inlineStyles(html: string, distDir: string): Promise<string> {
  const styleRegex = /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*\/?\>/gi;
  return replaceAsync(html, styleRegex, async (full, href) => {
    const css = await readAsset(distDir, href);
    if (!css) return full;
    return `<style>\n${css}\n</style>`;
  });
}

async function replaceAsync(
  input: string,
  regex: RegExp,
  replacer: (full: string, captured: string) => Promise<string>
): Promise<string> {
  const matches = Array.from(input.matchAll(regex));
  if (!matches.length) return input;
  let output = input;
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const match = matches[i];
    const index = match.index ?? 0;
    const replacement = await replacer(match[0], match[1]);
    output = `${output.slice(0, index)}${replacement}${output.slice(index + match[0].length)}`;
  }
  return output;
}

async function readAsset(distDir: string, ref: string): Promise<string | null> {
  const normalized = ref.replace(/^\//, '');
  const fullPath = path.join(distDir, normalized);
  try {
    return await fs.readFile(fullPath, 'utf-8');
  } catch {
    return null;
  }
}
