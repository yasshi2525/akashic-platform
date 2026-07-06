import { Transform } from "node:stream";
import { maskSecrets } from "./secretMasker";

export function createMaskTransform() {
    let buffer = "";
    return new Transform({
        transform(chunk, _encoding, callback) {
            buffer += chunk.toString("utf-8");
            // シークレットが chunk 境界をまたいでも取りこぼさないよう、改行までバッファ
            let index = buffer.indexOf("\n");
            let out = "";
            while (index !== -1) {
                const line = buffer.slice(0, index + 1);
                out += maskSecrets(line);
                buffer = buffer.slice(index + 1);
                index = buffer.indexOf("\n");
            }
            callback(null, out);
        },
        flush(callback) {
            if (buffer.length > 0) {
                callback(null, maskSecrets(buffer));
            } else {
                callback();
            }
        },
    });
}
