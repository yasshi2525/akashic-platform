export const openapi = {
    openapi: "3.0.3",
    info: {
        title: "akashic-storage HTTP API",
        version: "0.1.0",
    },
    paths: {
        "/start": {
            get: {
                summary: "Start a play session on storage",
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
        "/join": {
            get: {
                summary: "Join a play session",
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
        "/participants": {
            get: {
                summary: "Get participants",
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
                                    $ref: "#/components/schemas/ParticipantsResponse",
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
        schemas: {
            PlayTokenResponse: {
                type: "object",
                required: ["playToken"],
                properties: {
                    playToken: { type: "string" },
                },
            },
            ParticipantsResponse: {
                type: "object",
                required: ["participants"],
                properties: {
                    participants: {
                        type: "array",
                        items: { type: "string" },
                    },
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
