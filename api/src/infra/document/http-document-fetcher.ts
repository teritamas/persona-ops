import { load } from 'cheerio';
import type { DocumentFetcherPort } from '../../application/ports/document-fetcher-port.js';

export class HttpDocumentFetcher implements DocumentFetcherPort {
  async fetch(reference: string): Promise<string> {
    try {
      const response = await fetch(reference, {
        method: 'GET',
        headers: {
          'User-Agent': 'PersonaOps-DocumentFetcher/1.0',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000), // 10秒でタイムアウト
      });

      if (!response.ok) {
        throw new Error(
          `HTTP Error: ${response.status} ${response.statusText}`,
        );
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (contentType.includes('text/html')) {
        return this.parseHtml(text);
      }

      return text;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch document: ${error.message}`, {
          cause: error,
        });
      }
      throw new Error('Failed to fetch document due to unknown error', {
        cause: error,
      });
    }
  }

  private parseHtml(html: string): string {
    const $ = load(html);

    // 不要な要素を削除
    $('script').remove();
    $('style').remove();
    $('noscript').remove();
    $('iframe').remove();
    $('nav').remove();
    $('footer').remove();
    $('header').remove();

    // プレーンテキストを取得
    let text = $('body').text() || $.text();

    // 空白や改行を整理
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }
}
