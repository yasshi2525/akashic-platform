export const openapi = {
    openapi: "3.0.3",
    info: {
        title: "akashic-server HTTP API",
        version: "0.1.0",
    },
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
    },
    components: {
        schemas: {
            StartRequest: {
                type: "object",
                required: [
                    "contentId",
                    "contentUrl",
                    "assetBaseUrl",
                    "configurationUrl",
                    "playerId",
                    "playerName",
                ],
                properties: {
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
        },
    },
} as const;

export type OpenApiDocument = typeof openapi;
