import { context, propagation } from "@opentelemetry/api";

/**
 * play.id / content.id を OpenTelemetry の Baggage としてコンテキストに載せ、
 * その中で fn を実行する。
 *
 * Baggage は伝播器（W3CBaggagePropagator）により emit 時の carrier へ inject され、
 * storage 側でスパン属性として転記される。これにより「どの play / どの content の
 * 操作が遅いか」を、長命スパンを作らずに各短命スパンの属性として解析できる。
 *
 * playStorage.run（AsyncLocalStorage）と同じスコープで呼ぶことで、ゲームループの
 * tick emit など後続の非同期処理にも Baggage が伝播する。
 */
export const withPlayBaggage = <T>(
    playId: number | string,
    contentId: number | string,
    fn: () => T,
): T => {
    const baggage = propagation.createBaggage({
        "play.id": { value: String(playId) },
        "content.id": { value: String(contentId) },
    });
    const ctx = propagation.setBaggage(context.active(), baggage);
    return context.with(ctx, fn);
};
