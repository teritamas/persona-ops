# MCP (Model Context Protocol) Server

PersonaOps のシミュレーション結果や要件データを、VSCode などの外部ツール（MCP クライアント）から利用できるようにするためのサーバーです。

## 概要

このサーバーは **薄いプロキシ（Proxy Pattern）** として動作します。

- クライアント（VSCode）からの MCP リクエストをパブリックに待ち受けます。
- DBなどのリソースへ直接アクセスは行わず、内部の Private API (`api`) を HTTP で呼び出して結果を取得します。
- 取得した構造化データを、AIコンテキストとして理解しやすいように Markdown 形式へと整形して返却します。

```
[MCP Client (VSCode)] ──(Public HTTP/SSE)──> [MCP Server] ──(Private HTTP)──> [Private API] ──> [Firestore]
```

## 提供するツール (Tools)

1. `list_projects`:
   現在利用可能なプロジェクトの一覧を返却します。
2. `list_requirements`:
   特定のプロジェクトに紐づく要件（Requirement）の一覧を返却します。
3. `get_requirement_with_simulations`:
   特定の要件の構成内容と、その要件に対して実行されたペルソナシミュレーション（評価・懸念）の結果を統合した Markdown テキストを返却します。
4. `save_requirement_draft`:
   新規に要件を作成、または既存の要件を上書き更新（編集）してドラフト状態で保存します。既存の要件を編集する場合は、上書きによる情報消失を防ぐため、事前に `get_requirement_with_simulations` で元の情報を取得した上で実行することが推奨されます。
5. `request_persona_simulation`:
   特定の要件（ID）に対して、仮想ペルソナによるシミュレーションの実行を要求します。非同期で開始され、シミュレーションIDが返却されます。
6. `get_simulation_result`:
   シミュレーションIDを指定して実行状況（ステータス）および完了後の集計結果や各ペルソナの反応（フィードバック、懸念事項など）を統合した Markdown を返却します。まだ実行中の場合は、未完了であることを返します。

## ローカル開発手順

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.local` などを適宜設定してください。

- `PORT`: MCP サーバーが待機するポート番号（デフォルト: `8080`）
- `PRIVATE_API_URL`: Private API のベースURL（デフォルト: `http://localhost:3001`）

### 3. 開発サーバーの起動（ホットリロード有効）

```bash
pnpm dev
```

### 4. 静的チェックとテスト

```bash
pnpm run format       # Prettierによるコード整形
pnpm run format:check # Prettierによる整形チェック
pnpm run lint         # ESLintによる静的解析
pnpm run typecheck    # TypeScriptの型チェック
pnpm run test         # VitestによるE2Eテスト実行
```

## Docker ビルド

本番環境用にコンテナイメージをビルドする場合：

```bash
docker build -t persona-ops-mcp-server .
```

## 各種クライアントとの接続設定 (VS Code / Antigravity)

本サーバーは、複数クライアントからの同時接続や再接続に対応するため、マルチセッション管理をサポートしています。
ローカルで MCP サーバーがポート `8090`（デフォルト）で起動している場合、以下の設定を行うことで各クライアントから利用可能になります。

### 1. VS Code (Claude Dev / Cline / Roo Code 等) の設定

VS Code から利用する場合、プロジェクトのルートにある `.vscode/mcp.json` にて以下のように設定されています。

```json
{
  "servers": {
    // ローカル開発用
    "persona-ops-local": {
      "url": "http://localhost:8090/mcp/"
    },
    // Stg環境用
    "persona-ops-stg": {
      "url": "https://persona-ops-mcp-server-453092834186.asia-northeast1.run.app/mcp/"
    }
  }
}
```

### 2. Antigravity (Gemini / IDE) の設定

Antigravity から接続する場合、以下のグローバル設定ファイルに記述します。
Streamable HTTP 接続を stdio にラップするため、`mcp-remote` ユーティリティを使用して `http-only` トランスポートを指定する以下の構成が推奨されます。

**設定ファイルパス:** `~/.gemini/config/mcp_config.json`

```json
{
  "mcpServers": {
    "personaOpsLocal": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "http://127.0.0.1:8090/mcp",
        "--allow-http",
        "--transport",
        "http-only"
      ]
    }
  }
}
```
