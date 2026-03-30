export const customFooterHref = process.env.CUSTOM_FOOTER_HREF;
export const customFooterLabel = process.env.CUSTOM_FOOTER_LABEL;
export const customFooterImageWidth = process.env.CUSTOM_FOOTER_IMAGE_WIDTH
    ? Number.parseInt(process.env.CUSTOM_FOOTER_IMAGE_WIDTH)
    : undefined;
export const customFooterImagePath = process.env.CUSTOM_FOOTER_IMAGE_PATH;
export const niconicommonsWorkUrl = process.env.NICONICOMMONS_WORK_URL;
export const clientLogCacheMaxEntries = Number.parseInt(
    process.env.CLIENT_LOG_CACHE_MAX_ENTRIES ?? "1000",
);
