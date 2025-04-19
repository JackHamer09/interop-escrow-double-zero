"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Observable = void 0;
class Observable {
    constructor() {
        this.subscribers = [];
    }
    subscribe(callback) {
        this.subscribers.push(callback);
        const unsubscribe = () => {
            this.unsubscribe(callback);
        };
        return unsubscribe;
    }
    unsubscribe(callback) {
        const index = this.subscribers.indexOf(callback);
        if (index !== -1) {
            this.subscribers.splice(index, 1);
        }
    }
    notify(param) {
        this.subscribers.forEach((callback) => {
            try {
                callback(param);
            }
            catch (error) {
                console.error("Error in subscriber callback:", error);
            }
        });
    }
}
exports.Observable = Observable;
//# sourceMappingURL=observable.js.map