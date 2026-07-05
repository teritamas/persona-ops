# PersonaOps

## 基本姿勢

- 基本指針として[ハッカソン規約](./docs/hackathon_rules.md)を確認し、最優秀賞を目指して開発する。
- 特にアーキテクチャ選定やライブラリの選定を行う時は、推奨技術が利用されているかを常に意識する。

## MVPのスコープ

開発方針や要件定義で判断に迷った時は下記の資料を参考にする。

- [エレベーターピッチ](./docs/elevator_pitch.md)
- [MVPユーザーストーリー](./docs/user_story_mvp.md)

現時点ではユーザーストリーのうちのPh1を実装予定だが、他のステークホルダが困っている課題の解決につながりそうであれば、柔軟にスコープを広げることも検討する。

## 実装ルール

各環境の実装ルールはそれぞれのフォルダのルートのAGENTS.mdを確認してください

- フロントエンド: [frontend/AGENTS.md](./frontend/AGENTS.md)
- API: [api/AGENTS.md](./api/AGENTS.md)
- インフラ: [infra/terraform/AGENTS.md](./infra/terraform/AGENTS.md)

## 共通ルール

- SOLID、YAGNI、DRY、KISSを守り、現行MVPに必要な最小の実装にする。
- 意味のある名前を使い、複雑な実装には処理内容ではなく採用理由をコメントする。
- テストファイル内のタイトルや説明文は、`api` と同様に必ず日本語で記述する。
