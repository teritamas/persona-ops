# Frontend Workspace Rules

## ドキュメント

- 開発前に[README.md](./README.md)で技術構成、起動方法、利用可能なコマンドを確認する。
- `package.json`のscripts、必要な事前準備、ディレクトリ構成を変更した場合は、同じ変更で`README.md`も更新する。
- `README.md`には利用者向けの事実と実行手順を記載し、設計規則や実装判断はこの`AGENTS.md`に記載する。
- コマンドは`package.json`に存在し、リポジトリ上で再現できるものだけを記載する。
- `.vscode/tasks.json` の `detail` には、似たコマンドとの差分を必ず書く。
  - 例：`build:css` は「一度だけ生成して終了」、`watch:css` は「変更監視を続ける」
  - 例：`start` は「単体起動」、`dev` は「開発用の補助プロセス込みで起動」

## テストの記述規則

- テストファイル内のタイトルや説明文は、`api` と同様に必ず日本語で記述する。
- `test()`、`describe()`、`it()`、`t.test()` などに渡す文言は、期待仕様が読める表現にする。

## 技術方針

- Express、EJS、HTMX、Tailwind CSSを既存の標準構成として利用する。
- クライアント側JavaScriptを増やす前に、EJSによるサーバーレンダリングとHTMXによる部分更新で実現できないか検討する。
- MVPに不要なフロントエンドフレームワーク、状態管理ライブラリ、ビルドツールは追加しない。
- ルートの`AGENTS.md`にあるプロダクト方針とMVPスコープを優先する。

## ディレクトリと責務

| パス              | 責務                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `server.js`       | ミドルウェア、静的配信、view engine、routerの組み立て、listen処理 |
| `src/clients/`    | private APIへの認証付きserver-side HTTP通信                       |
| `src/routes/`     | HTTP入力の検証、ユースケース呼び出し、HTTPレスポンス              |
| `src/data/`       | プロトタイプ用モックデータとインメモリ状態                        |
| `src/utils/`      | 副作用を持たない表示変換・レンダリング補助                        |
| `views/`          | EJSのページテンプレート                                           |
| `views/partials/` | 複数箇所で利用するEJSパーツ                                       |
| `public/src/`     | 手書きするCSSなどの静的ソース                                     |
| `public/dist/`    | コマンドで生成する配信アセット                                    |

## 分割ルール

- `server.js`には業務ロジックを置かず、アプリケーションの組み立てだけを記述する。
- route handlerは外部入力を検証し、不正な入力には適切な4xxレスポンスを返す。
- `src/routes/index.js`が扱う機能を追加する場合、既存機能と独立しているなら機能単位のrouterへ分割する。
  - 例：`src/routes/chat.js`、`src/routes/projects.js`
- 複数routeで共有する状態操作や処理はrouteから分離する。ただし、一度しか使わない処理を将来予測で抽象化しない。
- server-sideからprivate APIを呼ぶ場合は`src/clients/private-api.js`の共通クライアントを利用する。
- route内でGoogle Auth、認証ヘッダ、API base URL、timeoutを個別実装しない。
- private APIのendpointは共通クライアントへroot-relative pathを渡して呼び出し、絶対URLを直接指定しない。
- private APIをブラウザから直接呼ばず、公開frontendのserver-side routeを経由させる。
- 公開する API route は `api/v1` prefix を必須とし、追加・変更時に bare な `/api` や version なし path を新設しない。
- APIクライアントはプロセス単位で再利用し、リクエストごとに生成しない。
- 同じUI断片を複数箇所で利用する場合は`views/partials/`へ移す。
- EJSで表現できるHTMLをJavaScript文字列として新規追加しない。HTMXレスポンスも原則としてEJS partialをrenderする。
- 生成物の`public/dist/`を直接編集しない。`public/src/`を編集して`pnpm build`で生成する。

## コーディングと品質

- SOLID、YAGNI、DRY、KISSを守り、現行MVPに必要な最小の実装にする。
- 意味のある名前を使い、複雑な実装には処理内容ではなく採用理由をコメントする。
- ユーザー由来の値をHTMLへ出力する場合は、EJSのエスケープ出力`<%= ... %>`を使用する。
- 修正後は最低限`pnpm lint`を実行する。CSSまたはテンプレートを変更した場合は`pnpm build`も実行する。
- 共通クライアントまたはrouteを変更した場合は`pnpm test`も実行する。
- scriptsを追加・変更した場合は`.vscode/tasks.json`のfrontend taskも同期する。
- script 名は役割がわかる粒度で分け、似た名前の script を追加する場合は差分が即座にわかる命名にする。
  - `build:*` は単発実行、`watch:*` は継続監視、`dev` は開発用の複合起動、`start` は本体プロセス単体起動を基本とする。
