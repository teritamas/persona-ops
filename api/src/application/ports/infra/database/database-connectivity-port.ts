/**
 * データベースの接続確認を行うためのポート
 */
export interface DatabaseConnectivityPort {
  check(): Promise<void>;
}
