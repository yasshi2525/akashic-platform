type LoadFunc = (
    window: Window,
    src: string,
    cb: (err: Error | null) => void,
) => void;

type CallbackHandler = (err: Error | null) => void;

export class ScriptManager {
    _loadedTableMap: WeakMap<Window, Record<string, boolean>>;
    _loadingTableMap: WeakMap<Window, Record<string, CallbackHandler[]>>;
    _loadFunc: LoadFunc;

    /**
     * NOTE: 本当は loadFunc?: だが、転記ミス防止のため必須パラメタにしている
     */
    constructor(loadFunc: LoadFunc | undefined) {
        this._loadedTableMap = new WeakMap();
        this._loadingTableMap = new WeakMap();
        this._loadFunc = loadFunc ?? ScriptManager._addScriptElement;
    }

    static _addScriptElement(win: Window, src: string, cb: CallbackHandler) {
        const script = win.document.createElement("script");
        script.src = src;
        script.addEventListener("load", () => cb(null));
        script.addEventListener(
            "error",
            () => new Error(`failed to load script: ${src}`),
        );
        win.document.head.appendChild(script);
    }

    appendScripts(win: Window, srcList: string[], cb: CallbackHandler) {
        const errSrcList: string[] = [];
        let remainSrcCount = srcList.length;
        if (srcList.length) {
            for (const src of srcList) {
                this._appendScript(win, src, (err) => {
                    if (err) {
                        errSrcList.push(src);
                    }
                    if (--remainSrcCount <= 0) {
                        if (errSrcList.length === 0) {
                            cb(null);
                        } else {
                            cb(
                                new Error(
                                    `failed to load scripts: ${errSrcList.join(", ")}`,
                                ),
                            );
                        }
                    }
                });
            }
        } else {
            setTimeout(() => cb(null), 0);
        }
    }

    _appendScript(win: Window, src: string, cb: CallbackHandler) {
        if (!this._loadedTableMap.has(win)) {
            this._loadedTableMap.set(win, {});
        }
        const loaded = this._loadedTableMap.get(win)!;
        if (loaded[src]) {
            setTimeout(() => cb(null), 0);
        } else {
            if (!this._loadingTableMap.has(win)) {
                this._loadingTableMap.set(win, {});
            }
            const loading = this._loadingTableMap.get(win)!;
            if (loading[src]) {
                loading[src].push(cb);
            } else {
                loading[src] = [cb];
                this._loadFunc(win, src, (err) => {
                    if (!err) {
                        loaded[src] = true;
                    }
                    const cbList = loading[src];
                    delete loading[src];
                    for (const cb of cbList) {
                        cb(err);
                    }
                });
            }
        }
    }
}
