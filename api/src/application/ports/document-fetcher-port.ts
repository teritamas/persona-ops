export interface DocumentFetcherPort {
  /**
   * URLなどの参照先からコンテンツをプレーンテキストで取得する
   * @param reference URLやドキュメントIDなど
   */
  fetch(reference: string): Promise<string>;
}
