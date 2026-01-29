export const openapi = {
    openapi: "3.0.3",
    info: {
        title: "akashic-storage HTTP API (admin)",
        version: "0.1.0",
    },
    security: [{ InternalToken: [] }],
    paths: {
        "/start": {
            get: {
                summary: "Start a play session on storage",
                security: [{ InternalToken: [] }],
                parameters: [
                    {
                        name: "playId",
                        in: "query",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/PlayTokenResponse",
                                },
                            },
                        },
                    },
                    "400": { description: "Bad Request" },
                    "422": { description: "Unprocessable Entity" },
                },
            },
        },
        "/end": {
            get: {
                summary: "End a play session",
                security: [{ InternalToken: [] }],
                parameters: [
                    {
                        name: "playId",
                        in: "query",
                        required: true,
                        schema: { type: "string" },
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
                    "422": { description: "Unprocessable Entity" },
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
            PlayTokenResponse: {
                type: "object",
                required: ["playToken"],
                properties: {
                    playToken: { type: "string" },
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
