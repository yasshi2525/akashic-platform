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
                    "400": { description: "Bad Request" },
                    "500": { description: "Internal Server Error" },
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
                    "400": { description: "Bad Request" },
                    "500": { description: "Internal Server Error" },
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
                    "400": { description: "Bad Request" },
                    "404": { description: "Not Found" },
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
                    "400": { description: "Bad Request" },
                    "404": { description: "Not Found" },
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
        },
    },
} as const;

export type OpenApiDocument = typeof openapi;
