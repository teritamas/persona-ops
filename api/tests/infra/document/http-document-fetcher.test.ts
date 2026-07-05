import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpDocumentFetcher } from '../../../src/infra/document/http-document-fetcher.js';

describe('HTTP参照資料取得', () => {
  let fetcher: HttpDocumentFetcher;

  beforeEach(() => {
    fetcher = new HttpDocumentFetcher();
    // モックフェッチのリセット
    vi.stubGlobal('fetch', vi.fn());
  });

  it('HTMLを取得してプレーンテキストを抽出する', async () => {
    const mockHtml =
      '<html><head><title>Test</title></head><body><h1>Hello</h1><p>World</p><script>alert(1);</script></body></html>';
    const mockResponse = {
      ok: true,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: vi.fn().mockResolvedValue(mockHtml),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await fetcher.fetch('https://example.com');
    expect(result).toBe('HelloWorld');
  });

  it('HTML以外は取得したテキストをそのまま返す', async () => {
    const mockText = 'Just plain text';
    const mockResponse = {
      ok: true,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: vi.fn().mockResolvedValue(mockText),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await fetcher.fetch('https://example.com/file.txt');
    expect(result).toBe('Just plain text');
  });

  it('正常でないHTTPレスポンスをErrorに変換する', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await expect(fetcher.fetch('https://example.com')).rejects.toThrow(
      'Failed to fetch document: HTTP Error: 404 Not Found',
    );
  });

  it('Error以外の取得失敗を汎用Errorに変換する', async () => {
    vi.mocked(fetch).mockRejectedValue('String error');
    await expect(fetcher.fetch('https://example.com')).rejects.toThrow(
      'Failed to fetch document due to unknown error',
    );
  });
});
