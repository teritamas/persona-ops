# PersonaOps

> コードレビューの前に、 ユーザー影響をレビューする。  
> それがペルソナOpsです。

## 企画

- [エレベーターピッチ](./docs/elevator_pitch.md)
- [MVPユーザーストーリー](./docs/user_story_mvp.md)

## ハッカソン規約

- [ハッカソン規約](./docs/hachathon_restriction.md)

## アプリケーション構成

- **バックエンド/ルーティング**: Node.js + Express.js
- **フロントエンド（UI構築）**: EJS + Tailwind CSS + Flowbite
- **フロントエンド（非同期通信）**: HTMX (SPA風の部分更新を実現)
- **CI/静的解析**: GitHub Actions + ESLint

## ローカル環境の構築手順

リポジトリをクローン後、以下の手順で開発サーバーを起動してください。

```bash
cd frontend
npm install
npm run dev
```

起動後、ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスすると、PersonaOpsのシミュレーション環境をご利用いただけます。

## ディレクトリ構成

- `frontend/server.js`: Expressサーバーのエントリーポイント
- `frontend/src/routes/`: APIおよびUIレンダリングのルーティング
- `frontend/src/data/`: モックデータや状態管理（インメモリストア）
- `frontend/src/utils/`: HTMLやUIパーツを生成するレンダリングロジック
- `frontend/views/`: EJSテンプレート（`index.ejs`, `partials/`など）
- `frontend/public/`: 静的ファイルやTailwindのコンパイル済みCSS
