/**
 * ストレージの接続確認を行うためのポート
 */
export interface StorageConnectivityPort {
  check(): Promise<void>;
}
