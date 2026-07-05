# MCP (Model Context Protocol) Server

PersonaOps のシミュレーション結果（評価・懸念事項）や要件データを、VSCode などの外部ツール（MCP クライアント）から透過的に利用できるようにするためのサーバーです。

## 概要

このサーバーは **薄いプロキシ（Proxy Pattern）** として動作します。

- クライアント（VSCode）からの MCP リクエストをパブリックに待ち受けます。
- DBなどのリソースへ直接アクセスは行わず、内部の Private API (`api` パッケージ) を HTTP で呼び出して結果を取得します。
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
