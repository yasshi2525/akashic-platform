import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    experimental: {
        serverActions: {
            bodySizeLimit: "30mb",
        },
    },
    trailingSlash: true,
};

export default nextConfig;
