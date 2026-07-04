# PersonaOps Frontend

Express、EJS、HTMXで構築したPersonaOpsのフロントエンド・プロトタイプ。

## 技術構成

- サーバー・ルーティング：Node.js、Express
- UIテンプレート：EJS
- 部分更新：HTMX
- スタイル：Tailwind CSS
- private API接続：共通server-side APIクライアント（ローカルは認証なし、Cloud RunはGoogle ID token）
- 静的解析：ESLint

## 事前準備

- Node.js 24以降
- pnpm 11.7.0

依存関係をインストールする。

```sh
cd frontend
pnpm install --frozen-lockfile
```

## ローカル起動

開発サーバーとTailwind CSSのwatchを同時に起動する。

```sh
pnpm dev
```

起動後、[http://localhost:3000](http://localhost:3000)へアクセスする。
`3000` が使用中の場合は、開発時に限り `3001` 以降の空きポートへ自動で切り替わる。

ローカルでは先に`api`を起動する。

```sh
cd api
pnpm dev
```

frontendはデフォルトで`http://127.0.0.1:8080`のローカルAPIを認証なしで呼ぶ。変更する場合だけ起動前に環境変数を設定する。

```sh
export API_BASE_URL=http://127.0.0.1:8080
export API_AUTH_MODE=none
pnpm dev
```

`/ops/health`では、公開frontendの`GET /api/v1/healthz`を経由してローカルAPIの`GET /api/v1/healthz`を確認できる。

## コマンド

| コマンド         | 用途                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| `pnpm dev`       | CSSのwatch、LiveReload、サーバーコード変更時の自動再起動をまとめて起動する |
| `pnpm start`     | Expressサーバーを起動する。`PORT`未指定時は`3000`を使う                    |
| `pnpm build`     | 配信用のTailwind CSSを生成する                                             |
| `pnpm build:css` | Tailwind CSSを一度だけ生成する                                             |
| `pnpm watch:css` | Tailwind CSSを監視して継続的に生成する                                     |
| `pnpm lint`      | ESLintでJavaScriptを静的解析する                                           |
| `pnpm test`      | Node.js標準テストランナーで単体テストを実行する                            |

VS Codeでは「ターミナル: タスクの実行」から、同名の`frontend: ...`タスクを実行できる。

## ディレクトリ構成

```text
frontend/
├── server.js              # Expressサーバーのエントリーポイント
├── src/
│   ├── clients/           # private APIへの共通server-side通信
│   ├── controllers/       # HTTPリクエスト処理とレスポンス返却
│   ├── routes/            # HTTPルーティング
│   ├── services/          # ビジネスロジックと外部API通信
│   │   └── dummy_data/    # モックデータとインメモリ状態
│   └── views/             # EJSテンプレート
│       ├── index.ejs      # 画面全体のテンプレート
│       └── partials/      # 再利用するEJSパーツ
├── public/
│   ├── src/               # Tailwind CSSの入力
│   └── dist/              # 生成済みCSS
├── Dockerfile
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

ファイルの配置・分割・READMEの更新ルールは[AGENTS.md](./AGENTS.md)を参照する。
