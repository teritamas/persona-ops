# PersonaOps API

FastifyとGoogle Agent Development Kit（ADK）で構築したバックエンド。

## 事前準備

先にbootstrapとstg Terraformをapplyし、Firestore、Cloud Storage、Cloud Runサービスアカウントを作成する。

Terraformの手順は[`infra/terraform/README.md`](../infra/terraform/README.md)を参照する。（実行済みのため、20260704現在は原則不要）

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
curl http://127.0.0.1:8080/api/v1/healthz
curl http://127.0.0.1:8080/api/v1/healthz/vertexai
```

## シミュレーションTaskのローカル実行

Cloud Tasksにはローカルエミュレータがないため、`.env.local`では次を設定する。

```sh
SIMULATION_QUEUE_DRIVER=local
SIMULATION_QUEUE=persona-simulations
LOCAL_TASK_BASE_URL=http://127.0.0.1:8080
```

`pnpm dev`でAPIを起動し、通常どおりチャットで要件を作成・承認する。Task登録時にLocal Adapterが同じAPIの内部Taskルートを非同期で呼び出すため、Cloud Tasksなしで一連の処理を確認できる。

Taskの受信、lease競合、完了時の成功・失敗件数、実行失敗はAPIの構造化ログへ出力される。ローカルでは`pnpm dev`を実行したターミナル、Cloud RunではCloud Loggingで確認する。

保存済みSimulationを手動で再実行する場合は、別ターミナルから内部ルートを呼び出す。

```sh
curl \
  -X POST \
  http://127.0.0.1:8080/api/v1/internal/projects/PROJECT_ID/simulations/SIMULATION_ID/run
```

本番では`SIMULATION_QUEUE_DRIVER`を省略し、Cloud Tasks Adapterを使用する。

## 備考: Cloud RunにデプロイされたAPIの動作確認

Cloud Runはインターネットにオープンにしていないため、通常の手順ではcurlコマンドなどで動作確認ができないので、Cloud Runのサービスアカウントをimpersonationして確認を行う。

環境変数を設定する。

```sh
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export USER_EMAIL="YOUR_EMAIL"
```

開発者へCloud RunサービスアカウントのToken Creator権限を付与する。

```sh
gcloud iam service-accounts add-iam-policy-binding \
  persona-ops-private-api@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="user:${USER_EMAIL}" \
  --role="roles/iam.serviceAccountTokenCreator"
```

サービスアカウントキーは発行せず、impersonationを使ってローカルADCを作成する。

```sh
gcloud auth login
gcloud config set project ${PROJECT_ID}
gcloud auth application-default login \
  --impersonate-service-account=persona-ops-private-api@${PROJECT_ID}.iam.gserviceaccount.com
```

Cloud Runは外部からの通信を遮断しているため、動作確認にはIAM認証が必須。呼び出すユーザーには対象サービスの`roles/run.invoker`が必要になる。

```sh
SERVICE_URL="$(
  gcloud run services describe persona-ops-private-api \
    --region=asia-northeast1 \
    --format='value(status.url)'
)"

curl \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  "${SERVICE_URL}/api/v1/healthz/vertexai"
```
