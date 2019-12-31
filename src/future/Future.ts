enum States {
  PENDING = "PENDING",
  FULFILLED = "FULFILLED",
  REJECTED = "REJECTED"
}

type ResolveFunction<T> = (value: T, error?: Error) => T | FutureLike | void;
type RejectFunction = (error) => void;
type FinallyFunction = () => void;

type CallbackFunction<T> = (
  resolve: ResolveFunction<T>,
  reject: RejectFunction
) => void;

type Pair<T, U> = [T, U];

type FutureLike = { then: <T>(value: T) => void };

export default class Future<T> {
  private state: States = States.PENDING;
  private value: T;
  private error: Error;

  private onResolveQueue: Pair<Future<T>, ResolveFunction<T>>[] = [];
  private onRejectQueue: Pair<Future<T>, RejectFunction>[] = [];
  private finallyQueue: Pair<Future<T>, FinallyFunction>[] = [];

  constructor(callback: CallbackFunction<T>) {
    setTimeout(() => {
      try {
        callback(
          (value: T) => this.resolve(value),
          error => this.reject(error)
        );
      } catch (error) {
        this.reject(error);
      }
    }, 0);
  }

  private isFutureLike = (object): boolean =>
    object &&
    object.hasOwnProperty("then") &&
    typeof object.then === "function";

  private resolve(value: T): void {
    if (this.state === States.PENDING) {
      this.state = States.FULFILLED;
      this.value = value;

      for (const [future, callback] of this.onResolveQueue) {
        const result: T | FutureLike | void = callback(value);
        if (this.isFutureLike(result)) {
          (result as FutureLike).then(value => future.resolve(value));
        } else {
          future.resolve(result as T);
        }
      }

      for (const [future, callback] of this.finallyQueue) {
        callback();
        future.resolve(value);
      }
    }
  }

  private reject(error): void {
    if (this.state === States.PENDING) {
      this.state = States.REJECTED;
      this.error = error;

      for (const [future, callback] of this.onRejectQueue) {
        callback(error);
        future.reject(error);
      }

      for (const [future, callback] of this.finallyQueue) {
        callback();
        future.reject(this.error);
      }
    }
  }

  public then(onResolved?: ResolveFunction<T>, onReject?: RejectFunction) {
    const future = new Future<T>((resolve, reject) => {});

    if (this.state === States.PENDING) {
      if (onResolved) {
        this.onResolveQueue.push([future, onResolved]);
      }
      if (onReject) {
        this.onRejectQueue.push([future, onReject]);
      }
    } else if (this.state === States.REJECTED && onResolved) {
      onResolved(this.value);
    } else if (this.state === States.FULFILLED && onReject) {
      onReject(this.error);
    }

    return future;
  }

  public catch(onReject: RejectFunction) {
    const future = new Future<T>((resolve, reject) => {});

    if (this.state === States.REJECTED) {
      onReject(this.error);
    } else {
      this.onRejectQueue.push([future, onReject]);
    }

    return future;
  }

  public finally(onFinally: FinallyFunction) {
    const future = new Future<T>((resolve, reject) => {});

    if (this.state !== States.PENDING) {
      onFinally();
    } else {
      this.finallyQueue.push([future, onFinally]);
    }

    return future;
  }
}
