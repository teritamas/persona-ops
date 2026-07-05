# MCP Server Workspace Rules

## ドキュメント参照

- 実装に関する全体方針は[AGENTS.md](../AGENTS.md)を参照する
- 動作確認手順などは [README.md](./README.md) の構成や開発コマンドなどを参照する

## テスト/静的解析

- テストファイル (`tests/**/*.ts`) 内の タイトル（説明文）は、必ず**日本語**で記述し、仕様書として機能させる
- ソースコードの修正作業が完了したら、**必ずCIと同じチェック（`pnpm lint`, `pnpm typecheck`, `pnpm test`）を手元で実行**し成功させる。失敗した場合は修正した上で成功するまで改善を繰り返す
- ESLint、Prettierによるフォーマットを徹底し、VitestによるE2Eテスト（`tests/**/*.ts`）を必ず実装し、必要に応じて既存のものを更新する

## MCPサーバー (Node.js/TypeScript) の開発方針

- **技術選定**: `@modelcontextprotocol/sdk` および Node.js 標準の `http.Server` (`StreamableHTTPServerTransport`) を標準とする。
- **セキュリティと設計境界 (Security Boundary & Proxy Pattern)**:
  - MCPサーバーはDB接続などの直接的なデータ永続化リソースにアクセスしてはならない。
  - すべてのデータ取得・操作は、Private API (`api` サービス) に対して HTTP リクエスト経由で行う。
  - MCPサーバーはクライアントに対する薄い「ゲートウェイ/プロキシ」および「Markdown/テキストフォーマッタ」として動作し、ビジネスロジックは Private API 側に寄せる。
- **非推奨APIの利用禁止**:
  - `McpServer.tool()` は非推奨であるため、ツール登録には `McpServer.registerTool()` を使用する。
  - パラメータ検証には `zod` を使用し、`registerTool` の `inputSchema` に `z.object` を定義する。

## ディレクトリ構成の責務

- `src/index.ts`: サーバーのブートストラップ、環境変数の読み込み、起動処理。
- `src/server.ts`: MCPサーバーのインスタンス作成、`src/tools/` 配下のツール登録関数の呼び出し、SSEトランスポートエンドポイントの設定。ヘルスチェックエンドポイント（`/health`）の公開。
- `src/tools/`: MCPツールの定義と登録（Fastifyのルーティング構造を踏襲）。
  - `project-tools.ts`: プロジェクト関連ツールの定義（`list_projects`）。
  - `requirement-tools.ts`: 要件・シミュレーション関連ツールの定義（`list_requirements`, `get_requirement_with_simulations`）。
- `src/api/`: Private API にリクエストを送信するクライアント群。
  - `http-client.ts`: 認証（IDトークンの自動取得・注入）と汎用リクエスト処理を担当する共通モジュール。
  - `project-api-client.ts`: プロジェクト関連の API リクエストをカプセル化する。
  - `requirement-api-clients.ts`: 要件、シミュレーション結果関連の API リクエストをカプセル化する。
  - `health-api-client.ts`: Private API のヘルスチェック疎通確認を担当する。
