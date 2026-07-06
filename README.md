# PersonaOps

[![API CI](https://github.com/teritamas/persona-ops/actions/workflows/api-ci.yml/badge.svg)](https://github.com/teritamas/persona-ops/actions/workflows/api-ci.yml)
[![CI](https://github.com/teritamas/persona-ops/actions/workflows/ci.yml/badge.svg)](https://github.com/teritamas/persona-ops/actions/workflows/ci.yml)
[![MCP CI](https://github.com/teritamas/persona-ops/actions/workflows/mcp-ci.yml/badge.svg)](https://github.com/teritamas/persona-ops/actions/workflows/mcp-ci.yml)
[![Terraform CI](https://github.com/teritamas/persona-ops/actions/workflows/terraform-ci.yml/badge.svg)](https://github.com/teritamas/persona-ops/actions/workflows/terraform-ci.yml)

> コードレビューの前に、 ユーザー影響をレビューする。  
> それがPersonaOpsです。

[![Youtubeへのリンク](docs/img/thumbnail.png)](https://www.youtube.com/watch?v=B-cwPGsg22I)
(クリックすると YouTube の動画に飛びます)

プロダクトの概要や動作イメージは、下記のProtoPediaの記事を参照ください。

- [PersonaOps | ProtoPedia](https://protopedia.net/prototype/8735)

## 全体構成

本アプリケーションは GCP 上にデプロイされており、mainブランチへのマージでフロントエンドとバックエンドが自動でデプロイされます。

![アーキテクチャ](./docs/img/persona-ops-architecture.png)

## コアとなるAIエージェント

PersonaOpsでは、2つのAIエージェントがシステムの中核を担っています。

### Persona Ops Agents: ペルソナ生成と要件定義

プロジェクトに関するドキュメントをアップロードすると、AIエージェントがその内容を解析し、ペルソナを生成・要件を整理します。

```mermaid
sequenceDiagram
    participant Client as Client<br/>(Web Browser)
    participant Agent as Persona Ops Agent<br/>(Cloud Run)
    participant Gemini as Vertex AI<br/>(Gemini API)
    participant DB as DB<br/>(Firestore Native)
    participant Tasks as Cloud Tasks

    %% ペルソナ生成フェーズ
    Note over Client, DB: 1. 仮想ペルソナの自律生成
    Client->>+Agent: 資料やプロンプトを入力する
    Agent->>+Gemini: 入力のコンテキストを読み込み、<br/>ペルソナを生成
    Gemini->>-Agent: ペルソナ情報を返す
    Agent->>+DB: 生成されたペルソナを保存
    DB->>-Agent: 保存完了
    Agent->>Client: ペルソナ一覧を表示

    %% 要件定義フェーズ
    Note over Client, DB: 2. アイデアからの要件整理
　loop 要件が固まるまで繰り返す
			Client->>Agent: 開発したい新機能のアイデアを<br/>チャットで入力
			Agent->>+Gemini: プロジェクトの文脈とアイデアを元に<br/>機能要件を整理・構造化
			Gemini->>-Agent: 整理された機能要件
			Agent->>+DB: 要件をプロジェクトに保存
			DB->>-Agent: 保存完了
			Agent->>Client: 要件をユーザーに提示(HITL)
			Client->>Client: 要件を確認・必要に応じて修正、問題がなければ保存
   end

    %% シミュレーション実行への移行
    Note over Client, DB: 3. シミュレーション開始
    Client->>Agent: 要件を指定し、<br/>シミュレーション開始をリクエスト
    Agent->>Tasks: タスクを登録
    Note over Agent, Tasks: タスクの実行はバックグラウンドで実行「機能2」へ進む
    Agent->>-Client: シミュレーション開始をユーザーに通知
```

### Simulation Agent: シミュレーションの実行

準備したペルソナと要件をもとに、AIエージェントが仮想環境でシミュレーションを実行する

```mermaid
sequenceDiagram
    participant Tasks as Cloud Tasks
    participant Agent as シミュレーションエージェント<br/>(Cloud Run)
    participant DB as DB<br/>(Firestore Native)
    participant Gemini as Vertex AI<br/>(Gemini API)

    Tasks->>+Agent: タスクをトリガーし<br/>シミュレーション開始

    loop プロジェクトに含まれるAIペルソナの数だけ繰り返す
        Agent->>+DB: 対象のAIペルソナを取得
        DB->>-Agent: AIペルソナの情報返す
        Agent->>+Gemini: 要件をAIペルソナにリクエスト<br/>AIペルソナの反応を生成
        Gemini->>-Agent: AIペルソナの反応を返す
        Agent->>DB: 結果を保存
    end

    Agent->>-Tasks: タスク完了
```

### MCPを利用したCoding Agnetとの連携

作成した要件をMCP経由で取得し、開発でそのまま利用することができます。

![mcp_vscode](./docs/img/mcp_vscode.png)

利用方法は[MCPのREADME.md](./mcp/README.md)を参照ください。

## 各種ドキュメント

### 企画

- [エレベーターピッチ](./docs/elevator_pitch.md)
- [MVPユーザーストーリー](./docs/user_story_mvp.md)
- [ハッカソン規約](./docs/hackathon_rules.md)

### 開発

各コンポーネントの操作方法や設計思想に関しては、下記を確認してください

- 全体
  - [AGENTS.md: 言語に関わらず全体の設計思想や実装に関するルール](./AGENTS.md)
- フロントエンド
  - [README.md: フロントエンドの起動方法や各種コマンドの説明](./frontend/README.md)
  - [AGENTS.md: フロントエンドの設計思想、実装に関するルール](./frontend/AGENTS.md)
- バックエンド
  - [README.md: Private APIサーバーの起動方法や各種コマンドの説明](./api/README.md)
  - [AGENTS.md: Private APIサーバーの設計思想、実装に関するルール](./api/AGENTS.md)
- MCPサーバー
  - [README.md: MCPサーバーの起動方法や各種コマンドの説明](./mcp/README.md)
  - [AGENTS.md: MCPサーバーの設計思想、実装に関するルール](./mcp/AGENTS.md)
- インフラストラクチャ
  - [README.md: GCPやterraformの初期構築手順や各種コマンドの説明](./infra/terraform/README.md)
  - [AGENTS.md: 設計思想、実装に関するルール](./infra/terraform/AGENTS.md)
