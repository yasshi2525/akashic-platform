export const openapi = {
    openapi: "3.0.3",
    info: {
        title: "manager-server HTTP API",
        version: "0.1.0",
    },
    paths: {
        "/health": {
            get: {
                summary: "Health check",
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/HealthResponse",
                                },
                            },
                        },
                    },
                },
            },
        },
        "/drain": {
            post: {
                summary: "Forward a signed drain request to webapp",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/DrainRequest",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Forwarded and applied",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ForwardResponse",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid JSON or invalid request body",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "413": {
                        description: "Payload too large",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "502": {
                        description: "Failed to forward request to webapp",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ForwardFailedResponse",
                                },
                            },
                        },
                    },
                    default: {
                        description: "Forwarded response from webapp",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ForwardResponse",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    components: {
        schemas: {
            HealthResponse: {
                type: "object",
                required: ["ok"],
                properties: {
                    ok: { type: "boolean" },
                },
            },
            DrainRequest: {
                type: "object",
                required: ["enabled"],
                properties: {
                    enabled: { type: "boolean" },
                    reason: { type: "string" },
                },
            },
            ForwardResponse: {
                type: "object",
                required: ["ok", "forwarded", "webapp"],
                properties: {
                    ok: { type: "boolean" },
                    forwarded: { type: "boolean" },
                    webapp: {
                        description: "Raw JSON response from webapp endpoint",
                        oneOf: [
                            { type: "object", additionalProperties: true },
                            { type: "array", items: {} },
                            { type: "string" },
                            { type: "number" },
                            { type: "boolean" },
                            { type: "null" },
                        ],
                    },
                },
            },
            ErrorResponse: {
                type: "object",
                required: ["ok", "reason"],
                properties: {
                    ok: { type: "boolean", enum: [false] },
                    reason: { type: "string" },
                },
            },
            ForwardFailedResponse: {
                type: "object",
                required: ["ok", "reason", "message"],
                properties: {
                    ok: { type: "boolean", enum: [false] },
                    reason: { type: "string", enum: ["ForwardFailed"] },
                    message: { type: "string" },
                },
            },
        },
    },
} as const;

export type OpenApiDocument = typeof openapi;
