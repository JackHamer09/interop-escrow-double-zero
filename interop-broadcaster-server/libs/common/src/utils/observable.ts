type CallbackFunction<T> = (param: T) => void;
export class Observable<T> {
  private subscribers: CallbackFunction<T>[] = [];

  public subscribe(callback: CallbackFunction<T>) {
    this.subscribers.push(callback);
    const unsubscribe = () => {
      this.unsubscribe(callback);
    };
    return unsubscribe;
  }

  public unsubscribe(callback: CallbackFunction<T>) {
    const index = this.subscribers.indexOf(callback);
    if (index !== -1) {
      this.subscribers.splice(index, 1);
    }
  }

  public notify(param: T) {
    this.subscribers.forEach((callback) => {
      try {
        callback(param);
      } catch (error) {
        console.error("Error in subscriber callback:", error);
      }
    });
  }
}

