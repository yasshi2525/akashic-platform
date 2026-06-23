# トレーサビリティ（分散トレーシング）

ElastiCache(Valkey) 読み書きの断続ラグの原因区間を特定するため、OpenTelemetry
によるトレーシングを導入している。「クライアント emit → Socket.IO → storage の
AMFlow ハンドラ → Valkey R/W」が 1 トレースに連結され、どこで時間を要したかを
可視化できる。

## 計装の構成

| レイヤ                                        | 実装                                                              | 内容                                                                                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| クライアント（akashic-server / ブラウザ共通） | `playlogClient-like/src/AMFlowClient.ts`                          | emit 時に現在の trace context を `carrier` に inject し、Socket.IO イベント引数として送信                                                      |
| イベントスキーマ                              | `schema/amflow/common/src/common.ts`                              | `Carrier` 型を追加。Valkey 触達 5 イベント（authenticate / sendTickPack / getTickList / putStartPoint / getStartPoint）に `carrier` 引数を追加 |
| storage ハンドラ                              | `akashic-storage/src/initializeSocket.ts`                         | `carrier` を extract し、SERVER スパンで包む（`amflow.*`）                                                                                     |
| Valkey R/W                                    | `akashic-storage/src/ValkeyAMFlowStore.ts`                        | valkey-glide には自動計装がないため CLIENT スパンを手動付与（`valkey.*`）                                                                      |
| SDK 初期化                                    | `akashic-storage/src/tracing.ts`, `akashic-server/src/tracing.ts` | NodeSDK 起動。X-Ray 互換の ID 生成器・伝播器を設定し OTLP/gRPC でエクスポート                                                                  |

### 主要なスパンと属性

- `amflow.sendTickPack` / `amflow.getTickList` / `amflow.putStartPoint` / `amflow.getStartPoint` / `amflow.authenticate`（SERVER）
- `valkey.pushTick`（CLIENT）
  - **`valkey.write_queue.depth`**: 書き込みキューの滞留量。`_drainValkeyQueue` は直列処理のため、断続ラグの主要因はまずここに現れる。
  - `amflow.event.count`, `amflow.tick.frame`
- `valkey.getTickList`（CLIENT）: `amflow.score.count`, `amflow.tick.from/to`
- `valkey.putStartPoint` / `valkey.authenticate`（CLIENT）

トレースから切り分かない場合は、ElastiCache の CloudWatch メトリクス
（`EngineCPUUtilization`, レプリカ遅延, `CurrConnections`, スロットリング）と
スパンのタイムスタンプを突き合わせる。`createValkeyConnection` は
`readFrom: "preferReplica"` のため、レプリカ遅延が直撃しうる点に注意。

### play / content による絞り込み（`play.id` / `content.id`）

複数の play が並行実行されるため、スパンに `play.id` / `content.id` 属性を付与して
play・ゲーム単位で解析できるようにしている。**長命スパンは作らず属性で表現する**
（OpenTelemetry の設計思想に準拠。長命スパンはエクスポート遅延・データ欠損・子
スパン爆発などの弊害がある）。

- `play.id`: storage が把握しているため `valkey.*` スパンに常時付与。
- `content.id` / `play.id`: akashic-server（active インスタンス）が **Baggage**
  （`withPlayBaggage`）で伝播し、storage 側で `amflow.*` / `valkey.*` スパンの属性に
  転記する（`applyBaggageAttributes`）。Baggage は emit ごとの carrier に乗るため、
  ゲームループの連続 tick にも付与される。
- passive / ブラウザ経路は Baggage が流れないが、`play.id` は 1 play = 1 content の
  対応関係から、akashic-server のスパンや DB 経由で content へ辿れる。

活用例（Jaeger）:

1. Service `akashic-storage` で **Tags** に `content.id=123` を入力して Find Traces
   → 特定ゲームの操作だけを抽出し、Duration ソートで重い content を特定。
2. `play.id=<id>` で特定 play の流れを横断的に確認。

> カーディナリティ注意: `play.id` は高カーディナリティ。トレースのタグ検索には
> 問題ないが、将来メトリクス化する際は `play.id` をラベルにしないこと（時系列爆発）。
> 集約は低カーディナリティな `content.id` で行う。

## 環境変数

| 変数                          | 既定                                 | 説明                                                |
| ----------------------------- | ------------------------------------ | --------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4317`              | ADOT Collector(OTLP/gRPC) のエンドポイント          |
| `OTEL_SERVICE_NAME`           | `akashic-storage` / `akashic-server` | サービス名（任意で上書き）                          |
| `OTEL_SDK_DISABLED`           | `false`                              | `true` でトレーシングを完全無効化（コードは no-op） |

トレーシング無効時、クライアントの `injectCarrier()` は空オブジェクトを返し、
storage 側 extract も root context となるため、挙動・性能に影響はない。

## ADOT Collector（ECS サイドカー）

各タスク（akashic-storage / akashic-server）に ADOT Collector をサイドカーとして
追加し、OTLP を受けて X-Ray に転送する。

### collector 設定（SSM パラメータ等で渡す）

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
processors:
  batch:
    timeout: 5s
exporters:
  awsxray:
    region: ap-northeast-1
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [awsxray]
```

### タスク定義（抜粋）

```jsonc
{
  "containerDefinitions": [
    {
      "name": "akashic-storage",
      "environment": [
        {
          "name": "OTEL_EXPORTER_OTLP_ENDPOINT",
          "value": "http://localhost:4317",
        },
      ],
      "dependsOn": [
        { "containerName": "aws-otel-collector", "condition": "START" },
      ],
    },
    {
      "name": "aws-otel-collector",
      "image": "public.ecr.aws/aws-observability/aws-otel-collector:latest",
      "command": ["--config=/etc/ecs/ecs-default-config.yaml"],
      "secrets": [
        {
          "name": "AOT_CONFIG_CONTENT",
          "valueFrom": "<SSMパラメータARN(上記YAML)>",
        },
      ],
    },
  ],
}
```

タスクロールに `xray:PutTraceSegments`, `xray:PutTelemetryRecords` を付与すること。

## ローカル（docker-compose）での確認手順

`docker-compose.yml` に **Jaeger all-in-one** を追加済み（`jaeger` サービス）。
Jaeger は OTLP 受信(gRPC:4317 / HTTP:4318)を内蔵するため、別途 Collector は不要。
storage / server には
`OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317` を設定済み。

```bash
# 新しい依存(OTel)を含めてイメージを再ビルドして起動
docker compose up -d --build akashic-storage akashic-server jaeger

# （全体を上げ直す場合）
docker compose up -d --build
```

確認手順:

1. ブラウザで <http://localhost:16686>（Jaeger UI）を開く。
2. 左上 **Service** で `akashic-storage` を選択し **Find Traces**。
3. プレイを動かして tick を流すと、`amflow.sendTickPack` →
   `valkey.pushTick`（その下に `valkey.write_queue.depth` 属性）といった
   スパンが表示される。スパンをクリックすると各区間の所要時間と属性を確認できる。
4. ラグ調査では、所要時間でソートして遅いスパンを探し、`valkey.*` が遅いのか、
   `valkey.write_queue.depth` が増大しているのかを確認する。

> 注意: OTel 依存を追加したため、**イメージの再ビルドが必要**（`--build`）。
> トレースを止めたい場合は各サービスに `OTEL_SDK_DISABLED=true` を設定する。

## ブラウザ計装（HTTP 起動経路）と、その制約

### 実装範囲

ブラウザ計装は **HTTP 起動経路のみ** 実装している。

| 実装           | ファイル                                                 | 内容                                                                                                        |
| -------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Web SDK 初期化 | `webapp/lib/client/browser-tracing.ts`                   | `WebTracerProvider` + `FetchInstrumentation`。伝播器は storage と同じ `AWSXRayPropagator`。OTLP/HTTP で送信 |
| 初期化トリガ   | `webapp/components/tracing-provider.tsx`                 | `"use client"` で一度だけ初期化（layout に常設）                                                            |
| 設定           | `webapp/lib/server/akashic.ts` (`publicOtelExporterUrl`) | `PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT`（空で無効化）                                                          |

`FetchInstrumentation` の `propagateTraceHeaderCorsUrls` を storage URL に限定し、
storage への `fetch` にのみ `X-Amzn-Trace-Id` を付与する（第三者への漏洩防止）。

### 重要な制約（tick ストリームは連結されない）

`AMFlowClient.injectCarrier()` は **現在アクティブなスパンがある場合のみ**
trace context を carrier に載せる（`propagation.inject(context.active(), …)`）。

- **HTTP ブートストラップ経路**（fetch 計装でスパンが張られる区間）は storage 側
  スパンと連結される。
- **tick ストリーム（WebSocket）** は、ゲームループ中にブラウザ側でアクティブな
  スパンが存在しないため連結されない（carrier は空になり、storage 側は root
  スパンになる）。連結するにはプレイセッションを覆う明示的なスパンが必要で、
  長時間 1 スパンになる／agvw 内部 emit の context.with 化が必要等、侵襲的かつ
  ROI が限定的なため対象外とした。tick の R/W 時間は storage 側スパン（`valkey.*`）
  で計測済みのため、断続ラグの調査は storage 側で完結できる。

### ブラウザ → コレクタ間の CORS（重要）

ブラウザは webapp オリジン（例 `http://localhost:3000`）から **別オリジンの
コレクタ**（Jaeger/ADOT の OTLP/HTTP）へ `Content-Type: application/x-protobuf` で
POST するため preflight が走る。コレクタ側で CORS を許可しないと
`No 'Access-Control-Allow-Origin' header is present` で失敗する。

ただし**ローカル・本番とも既定では下記「選択肢 2（同一オリジン proxy）」を採用**
しており、ブラウザはコレクタへ直接送らないため CORS は不要。直接送る構成
（選択肢 1）に切り替える場合のみ CORS 設定が必要になる。

ローカル（Jaeger）は直接送る構成に備え **オリジンを差し替え可能な形** でも
設定済み:

```yaml
# docker-compose.yml の jaeger サービス
COLLECTOR_OTLP_HTTP_CORS_ALLOWED_ORIGINS: ${WEBAPP_ORIGIN:-http://localhost:3000}
COLLECTOR_OTLP_HTTP_CORS_ALLOWED_HEADERS: "content-type"
```

`WEBAPP_ORIGIN` を上書きすれば任意の環境に対応できる（カンマ区切りで複数可）。

本番での選択肢（いずれも origin を環境ごとに設定する）:

1. **ADOT Collector の OTLP/HTTP receiver で CORS を許可**する。
   ```yaml
   receivers:
     otlp:
       protocols:
         grpc:
           endpoint: 0.0.0.0:4317
         http:
           endpoint: 0.0.0.0:4318
           cors:
             allowed_origins: ["https://<本番webappドメイン>"]
             allowed_headers: ["content-type"]
   ```
   この場合、ブラウザが到達できる位置にコレクタの HTTP receiver を公開する必要がある。
2. **同一オリジンproxy（推奨・実装済み）**: webapp の Route Handler
   `webapp/app/api/otel/v1/traces/route.ts` にブラウザが送り（同一オリジンなので
   CORS 不要）、サーバ側で内部コレクタへ転送する。コレクタを公開せず済むため
   本番で安全。**ローカル（docker-compose）も既定でこの経路**を使う。
   - `PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT=/api/otel/v1/traces`（ブラウザの送信先。
     相対パスなので同一オリジン）。
   - `INTERNAL_OTEL_EXPORTER_OTLP_ENDPOINT`（proxy の転送先＝内部コレクタの
     OTLP/HTTP traces エンドポイント。例 docker: `http://jaeger:4318/v1/traces`、
     本番: ADOT Collector の HTTP receiver）。空なら proxy は 204 を返し計装は no-op。
   - protobuf バイナリと `content-encoding`（gzip 等）はそのまま中継する。コレクタ
     到達不可時は 502 を返す。ブラウザ→storage は別オリジンのままなので CORS 不要。

> 補足: `akashic-storage` 自体の CORS（`cors` パッケージ）は未指定時に
> リクエストヘッダを反射するため、`X-Amzn-Trace-Id` は既定で許可される。
> ただし上記ブラウザ→storage の直接 fetch は現状ほぼ無いため影響は小さい。

### gRPC(4317) と HTTP(4318) のポート使い分け（事象2対策）

- **gRPC クライアント（Node の storage/server）→ 4317**
- **HTTP クライアント（ブラウザ）→ 4318**

OTLP/HTTP(HTTP/1) を 4317 に送ると Jaeger 側で
`http2Server ... received bogus greeting from client: "POST /v1/... HTTP/1."`
となる。本リポジトリは traces のみ計装しており metrics exporter は持たないため、
`/v1/metrics` の送信元は別の OTLP クライアントである可能性が高い。送信元を特定し、
HTTP なら 4318 に向けるか、不要なら停止する。

### ローカルでの送信先

webapp コンテナに同一オリジン proxy 経路を設定済み:

- `PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT=/api/otel/v1/traces`（ブラウザ→webapp、同一オリジン）
- `INTERNAL_OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318/v1/traces`（webapp→Jaeger、docker ネットワーク内）

ブラウザは webapp の Route Handler に送り、webapp が docker ネットワーク内の
Jaeger OTLP/HTTP へ転送する。Jaeger UI では Service `webapp-browser` として
確認できる。直接 Jaeger へ送りたい場合は `PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT` を
`http://localhost:4318/v1/traces` に戻す（この場合は上記 CORS 設定が効く）。

## AWS Console での作業手順

ECS(Fargate 想定) で X-Ray にトレースを送るための最小手順。

### 1. IAM: タスクロールに X-Ray 書き込み権限を付与

1. **IAM** → **ロール** → 対象タスクの **タスクロール**（task role。実行ロール
   execution role ではない）を開く。
2. **許可を追加** → **ポリシーをアタッチ** → `AWSXRayDaemonWriteAccess`
   （`xray:PutTraceSegments`, `xray:PutTelemetryRecords` を含む）を付与。

### 2. SSM: Collector 設定を保存

1. **Systems Manager** → **パラメータストア** → **パラメータの作成**。
2. 名前（例 `/akashic/adot-collector-config`）、タイプ **テキスト**、値に
   上記「ADOT Collector 設定 YAML」を貼り付けて作成。
3. execution role に `ssm:GetParameters` 権限を付与（または値を直接タスク定義の
   環境変数に埋める）。

### 3. ECS: タスク定義に Collector サイドカーを追加

1. **ECS** → **タスク定義** → 対象を選び **新しいリビジョンを作成**。
2. **コンテナを追加**:
   - 名前 `aws-otel-collector`
   - イメージ `public.ecr.aws/aws-observability/aws-otel-collector:latest`
   - コマンド `--config=/etc/ecs/ecs-default-config.yaml`
   - 環境（シークレット） `AOT_CONFIG_CONTENT` = 手順2の SSM パラメータ
3. アプリコンテナ（akashic-storage / akashic-server）に環境変数
   `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317` を追加。
4. アプリコンテナの **起動順序の依存関係** に `aws-otel-collector`(START) を追加。
5. リビジョンを作成し、**サービスを更新**して新リビジョンをデプロイ。

### 4. X-Ray でトレースを確認

1. **CloudWatch** → 左メニュー **X-Ray トレース** → **トレースマップ** /
   **トレース**（リージョンは Collector の `region` と一致させること）。
2. サービスマップに `akashic-storage` が現れ、配下に `valkey.*` スパンが連なる。
3. **トレース** で所要時間や `valkey.write_queue.depth` 等の属性を確認し、
   ElastiCache の CloudWatch メトリクスと時刻を突き合わせる。

> X-Ray の代わりに **CloudWatch Application Signals** や Amazon Managed Service
> for Prometheus + Grafana を使う場合は、Collector の `exporters` を差し替える
> （アプリ側のコード変更は不要）。
