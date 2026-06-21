import { Span, propagation } from "@opentelemetry/api";

/**
 * クライアント（akashic-server）から Baggage で伝播された横断的な識別子を、
 * 現在のスパンの属性として転記する。
 *
 * Baggage 自体はスパンに自動記録されないため、明示的にコピーする。play.id /
 * content.id を各短命スパンの属性にすることで、長命スパンを作らずに play /
 * content 単位の解析（重い content の特定など）を可能にする。
 *
 * Baggage が無い経路（passive / ブラウザ等）では何もしない。
 */
const BAGGAGE_ATTRIBUTE_KEYS = ["play.id", "content.id"] as const;

export const applyBaggageAttributes = (span: Span): void => {
    const baggage = propagation.getActiveBaggage();
    if (!baggage) {
        return;
    }
    for (const key of BAGGAGE_ATTRIBUTE_KEYS) {
        const entry = baggage.getEntry(key);
        if (entry) {
            span.setAttribute(key, entry.value);
        }
    }
};
