# PersonaOps API

FastifyとGoogle Agent Development Kit（ADK）で構築したバックエンド。

## エンドポイント

- `GET /healthz`：外部サービスへ接続しないliveness check
- `GET /healthz/vertexai`：ADKからVertex AIへ実際に推論を行う手動疎通確認

`/healthz/vertexai`は呼び出すたびにVertex AI利用料が発生するため、Cloud Runのstartup probeやreadiness probeには設定しないこと。

## 事前準備

先にbootstrapとstg Terraformをapplyし、Firestore、Cloud Storage、Cloud Runサービスアカウントを作成する。Terraformの手順は[`infra/terraform/README.md`](../infra/terraform/README.md)を参照する。（実行済みなので原則不要）

開発者へCloud RunサービスアカウントのToken Creator権限を付与する。

```sh
gcloud iam service-accounts add-iam-policy-binding \
  persona-ops-private-api@YOUR_STG_PROJECT_ID.iam.gserviceaccount.com \
  --member="user:YOUR_EMAIL" \
  --role="roles/iam.serviceAccountTokenCreator"
```

サービスアカウントキーは発行せず、impersonationを使ってローカルADCを作成する。

```sh
gcloud auth login
gcloud config set project YOUR_STG_PROJECT_ID
gcloud auth application-default login \
  --impersonate-service-account=persona-ops-private-api@YOUR_STG_PROJECT_ID.iam.gserviceaccount.com
```

## ローカル起動

```sh
cp api/.env.local.example api/.env.local
```

`.env.local`のproject IDとbucket名をstg環境に合わせて編集する。`VERTEX_AI_MODEL`はTerraformと同じモデルIDを指定する。

```sh
cd api
pnpm install --frozen-lockfile
pnpm verify:gcp
pnpm dev
```

下記のコマンドで疎通確認ができる

```sh
curl http://127.0.0.1:8080/healthz
curl http://127.0.0.1:8080/healthz/vertexai
```

## Cloud Runでの確認

Cloud Runは外部からの通信を遮断しているため、動作確認にはIAM認証が必須。呼び出すユーザーには対象サービスの`roles/run.invoker`が必要になる。

```sh
SERVICE_URL="$(
  gcloud run services describe persona-ops-private-api \
    --region=asia-northeast1 \
    --format='value(status.url)'
)"

curl \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  "${SERVICE_URL}/healthz/vertexai"
```
