import useSWR from "swr";

type RemainingResponse =
    | { ok: true; remainingMs: number; expiresAt: number }
    | { ok: false; reason: string };

const fetcher = async (url: string) =>
    (await (await fetch(url)).json()) as RemainingResponse;

export function usePlayRemaining(playId: string) {
    const { data, isLoading } = useSWR<RemainingResponse>(
        `/api/play/${playId}/remaining`,
        fetcher,
    );

    return {
        isLoading,
        data,
    };
}
