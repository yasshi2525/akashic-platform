export class ObjectList<T> {
    _objectList: T[];

    constructor() {
        this._objectList = [];
    }

    addItem(e: T) {
        this._objectList.push(e);
    }

    removeItem(t: T) {
        this._objectList = this._objectList.filter((e) => e !== t);
    }

    removeAllItems() {
        this._objectList = [];
    }

    forEach(cb: (e: T) => void) {
        this._objectList.forEach(cb);
    }
}
