export const openapi = {
    openapi: "3.0.3",
    info: {
        title: "akashic-server HTTP API",
        version: "0.1.0",
    },
    security: [{ InternalToken: [] }],
    paths: {
        "/start": {
            post: {
                summary: "Start a play session",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/StartRequest",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/StartResponse",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad Request",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "500": {
                        description: "Internal Server Error",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },
        "/end": {
            get: {
                summary: "End a play session",
                parameters: [
                    {
                        name: "playId",
                        in: "query",
                        required: true,
                        schema: { type: "integer", format: "int32" },
                    },
                    {
                        name: "reason",
                        in: "query",
                        required: false,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/EndResponse",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad Request",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "500": {
                        description: "Internal Server Error",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },
        "/remaining": {
            get: {
                summary: "Get remaining time of a play session",
                parameters: [
                    {
                        name: "playId",
                        in: "query",
                        required: true,
                        schema: { type: "integer", format: "int32" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/RemainingResponse",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad Request",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "404": {
                        description: "Not Found",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },
        "/extend": {
            post: {
                summary: "Extend a play session",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ExtendRequest",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ExtendResponse",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad Request",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "404": {
                        description: "Not Found",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "409": {
                        description: "Too Early",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ExtendTooEarlyResponse",
                                },
                            },
                        },
                    },
                },
            },
        },
        "/internal/asset": {
            post: {
                summary:
                    "[internal] Proxy an asset fetch for akashic-runner (X-Akashic-Internal-Token = SERVER_RUNNER_API_TOKEN)",
                description:
                    "akashic-runner からのアセット取得プロキシ。 akashic-server が assetBaseUrl/configurationUrl の prefix を検証して取得し返す。",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/AssetProxyRequest",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description:
                            "OK。S3/CDN のアセットを素通しで返す。Content-Type は上流のものを中継する。",
                        content: {
                            "application/octet-stream": {
                                schema: { type: "string", format: "binary" },
                            },
                        },
                    },
                    "400": {
                        description: "Bad Request",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "403": {
                        description: "Forbidden (disallowed url)",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "502": {
                        description: "Bad Gateway (upstream fetch failed)",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },
        "/internal/logs": {
            post: {
                summary:
                    "[internal] Receive content-log stream from akashic-runner (X-Akashic-Internal-Token = SERVER_RUNNER_API_TOKEN)",
                description:
                    "akashic-runner が投稿スクリプトの content-log を chunked ndjson で送出する。 akashic-server がマスクして S3 へ流す。",
                parameters: [
                    {
                        name: "playId",
                        in: "query",
                        required: true,
                        schema: { type: "integer", format: "int32" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/x-ndjson": {
                            schema: {
                                type: "string",
                                description:
                                    "改行区切り JSON のログ行ストリーム",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/OkResponse",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad Request",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "404": {
                        description: "Not Found (unknown playId)",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },
        "/internal/play-ended": {
            post: {
                summary:
                    "[internal] Notify a play end event from akashic-runner (X-Akashic-Internal-Token = SERVER_RUNNER_API_TOKEN)",
                description:
                    "akashic-runner が観測したプレイ終了(実行時エラー / storage 発)を通知する。 akashic-server が origin から storage への再通知要否を導出する。",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/PlayEndedRequest",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/OkResponse",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad Request",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    components: {
        securitySchemes: {
            InternalToken: {
                type: "apiKey",
                in: "header",
                name: "X-Akashic-Internal-Token",
            },
        },
        schemas: {
            StartRequest: {
                type: "object",
                required: [
                    "playName",
                    "contentId",
                    "contentUrl",
                    "assetBaseUrl",
                    "configurationUrl",
                    "playerId",
                    "playerName",
                ],
                properties: {
                    playName: { type: "string" },
                    contentId: { type: "string" },
                    contentUrl: { type: "string", format: "uri" },
                    assetBaseUrl: { type: "string", format: "uri" },
                    configurationUrl: { type: "string", format: "uri" },
                    playerId: { type: "string" },
                    playerUserId: { type: "string" },
                    playerName: { type: "string" },
                    joinWord: { type: "string" },
                    inviteHash: { type: "string" },
                    requireSignIn: { type: "boolean" },
                },
            },
            StartResponse: {
                type: "object",
                required: ["playId"],
                properties: {
                    playId: { type: "integer", format: "int32" },
                },
            },
            EndResponse: {
                type: "object",
                required: ["ok"],
                properties: {
                    ok: { type: "boolean" },
                },
            },
            RemainingResponse: {
                type: "object",
                required: ["ok", "remainingMs", "expiresAt"],
                properties: {
                    ok: { type: "boolean" },
                    remainingMs: { type: "integer", format: "int64" },
                    expiresAt: { type: "integer", format: "int64" },
                },
            },
            ExtendRequest: {
                type: "object",
                required: ["playId"],
                properties: {
                    playId: { type: "integer", format: "int32" },
                },
            },
            ExtendResponse: {
                type: "object",
                required: ["ok", "remainingMs", "expiresAt", "extendMs"],
                properties: {
                    ok: { type: "boolean" },
                    remainingMs: { type: "integer", format: "int64" },
                    expiresAt: { type: "integer", format: "int64" },
                    extendMs: { type: "integer", format: "int64" },
                },
            },
            ExtendTooEarlyResponse: {
                type: "object",
                required: ["ok", "reason", "remainingMs", "expiresAt"],
                properties: {
                    ok: { type: "boolean" },
                    reason: { type: "string" },
                    remainingMs: { type: "integer", format: "int64" },
                    expiresAt: { type: "integer", format: "int64" },
                },
            },
            ErrorResponse: {
                type: "object",
                required: ["ok", "reason"],
                properties: {
                    ok: { type: "boolean", enum: [false] },
                    reason: { type: "string" },
                    message: { type: "string" },
                },
            },
            OkResponse: {
                type: "object",
                required: ["ok"],
                properties: {
                    ok: { type: "boolean", enum: [true] },
                },
            },
            AssetProxyRequest: {
                type: "object",
                required: ["playId", "url"],
                properties: {
                    playId: { type: "integer", format: "int32" },
                    url: { type: "string", format: "uri" },
                },
            },
            PlayEndedRequest: {
                type: "object",
                required: ["playId", "reason", "origin"],
                properties: {
                    playId: { type: "integer", format: "int32" },
                    reason: { type: "string" },
                    origin: {
                        type: "string",
                        enum: ["runtime-error", "storage"],
                    },
                },
            },
        },
    },
} as const;

export type OpenApiDocument = typeof openapi;
