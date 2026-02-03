"use client";

import useSWR from "swr";
import { useAkashic } from "./useAkashic";

const fetcher = async (url: string): Promise<string | undefined> => {
    const res = await fetch(url);
    if (res.status === 200) {
        return await res.text();
    }
    return undefined;
};

export function useLicense(contentId: number) {
    const { publicContentBaseUrl } = useAkashic();
    const { data, error, isLoading } = useSWR(
        `${publicContentBaseUrl}/${contentId}/library_license.txt`,
        fetcher,
    );
    return {
        license: data,
        isLoading,
        error,
    };
}
