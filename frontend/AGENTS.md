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
- `test()`、`describe()`などに渡す文言は、期待仕様が読める表現にする。

## 技術方針

- Express、EJS、HTMX、Tailwind CSSを既存の標準構成として利用する。
- クライアント側JavaScriptを増やす前に、EJSによるサーバーレンダリングとHTMXによる部分更新で実現できないか検討する。
- MVPに不要なフロントエンドフレームワーク、状態管理ライブラリ、ビルドツールは追加しない。
- ルートの`AGENTS.md`にあるプロダクト方針とMVPスコープを優先する。

## ディレクトリと責務

| パス                       | 責務                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `server.js`                | ミドルウェア、静的配信、view engine、routerの組み立て、listen処理                                |
| `src/clients/`             | private APIへの認証付きserver-side HTTP通信                                                      |
| `src/routes/`              | URLパスとHTTPメソッドをControllerにマッピングする定義                                            |
| `src/controllers/`         | HTTPリクエストの受け入れ、Service呼び出し、レスポンスの返却（HTMX判定やEJSパーシャルの描画など） |
| `src/services/`            | ビジネスロジック、外部APIの呼び出し（通信の隠蔽）、データ操作などのカプセル化層                  |
| `src/services/projectState.js` | private APIから取得したプロジェクトの画面状態（Controllerから直接変更せず、Serviceを介する） |
| `src/utils/`               | 副作用を持たない表示変換・レンダリング補助                                                       |
| `src/views/`               | EJSのページテンプレート                                                                          |
| `src/views/partials/`      | 複数箇所で利用するEJSパーツ（HTMXのレスポンスとしても利用）                                      |
| `public/src/`              | 手書きするCSSなどの静的ソース                                                                    |
| `public/dist/`             | コマンドで生成する配信アセット                                                                   |

## 分割ルールと設計思想

- **EJSとHTMXの活用**: JS内にHTML文字列を直書きせず、`src/views/partials/` へパーシャルとして切り出す。ControllerはリクエストがHTMXからのもの（`req.headers['hx-request']`）であれば、画面全体ではなく更新に必要なパーシャルのみをレンダリングして返す。
- **レイヤー分離 (Thin Controller / Fat Service)**: `server.js` や Controller には業務ロジックを置かない。`routes/` はマッピングのみを行い、実際の処理・データアクセス・外部APIコールはすべて `services/` に委譲する。画面状態もControllerから直接触らず、必ずService経由で取得・更新する。
- **ルーティング命名規則**: フロントエンドのルーティングにおいて、API通信との混同を避けるため以下のプレフィックスを利用する。
  - `/action/`: POST等の状態更新やビジネスロジックを実行するエンドポイント。
  - `/view/`: GET等でHTMX向けのHTML要素（EJSパーシャル）を取得・描画するエンドポイント。
- route handlerは外部入力を検証し、不正な入力には適切な4xxレスポンスを返す。
- `src/routes/index.js` が肥大化しないよう、機能単位（`chatRoutes.js`, `personaRoutes.js` など）のルーターファイルに分割してマッピングする。
- 複数routeで共有する状態操作や処理はrouteから分離する。ただし、一度しか使わない処理を将来予測で抽象化しない。
- server-sideからprivate APIを呼ぶ場合は`src/clients/private-api.js`の共通クライアントを利用する。
- route内でGoogle Auth、認証ヘッダ、API base URL、timeoutを個別実装しない。
- private APIのendpointは共通クライアントへroot-relative pathを渡して呼び出し、絶対URLを直接指定しない。
- private APIをブラウザから直接呼ばず、公開frontendのserver-side routeを経由させる。
- 公開する API route は `api/v1` prefix を必須とし、追加・変更時に bare な `/api` や version なし path を新設しない。
- APIクライアントはプロセス単位で再利用し、リクエストごとに生成しない。
- 同じUI断片を複数箇所で利用する場合は`src/views/partials/`へ移す。
- EJSで表現できるHTMLをJavaScript文字列として新規追加しない。HTMXレスポンスも原則としてEJS partialをrenderする。
- 生成物の`public/dist/`を直接編集しない。`public/src/`を編集して`pnpm build`で生成する。

## コーディングと品質

- ユーザー由来の値をHTMLへ出力する場合は、EJSのエスケープ出力`<%= ... %>`を使用する。
- 修正後は最低限`pnpm lint`を実行する。CSSまたはテンプレートを変更した場合は`pnpm build`も実行する。
- 共通クライアントまたはrouteを変更した場合は`pnpm test`も実行する。
- scriptsを追加・変更した場合は`.vscode/tasks.json`のfrontend taskも同期する。
- script 名は役割がわかる粒度で分け、似た名前の script を追加する場合は差分が即座にわかる命名にする。
  - `build:*` は単発実行、`watch:*` は継続監視、`dev` は開発用の複合起動、`start` は本体プロセス単体起動を基本とする。
