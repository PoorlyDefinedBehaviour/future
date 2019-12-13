enum States {
  PENDING = "PENDING",
  FULFILLED = "FULFILLED",
  REJECTED = "REJECTED"
}

type ResolveFunction<T> = (value: T) => T | PromiseLike | void;
type RejectFunction = (error) => void;

type CallbackFunction<T> = (
  resolve: ResolveFunction<T>,
  reject: RejectFunction
) => void;

type Pair<T, U> = [T, U];

type PromiseLike = { then: <T>(value: T) => void };

export default class Future<T> {
  private state: States = States.PENDING;

  private onResolve: Pair<Future<T>, ResolveFunction<T>>;
  private onReject: Pair<Future<T>, RejectFunction>;

  constructor(callback: CallbackFunction<T>) {
    process.nextTick(() => {
      try {
        callback(
          (value: T): void => this.resolve(value),
          (error): void => this.reject(error)
        );
      } catch (error) {
        this.reject(error);
      }
    });
  }

  private isPromiseLike = (object): boolean =>
    object.hasOwnProperty("then") && typeof object.then === "function";

  private resolve(value: T): void {
    if (this.state === States.PENDING) {
      this.state = States.FULFILLED;

      const [future, callback] = this.onResolve;
      const result: T | PromiseLike | void = callback(value);

      if (this.isPromiseLike(result)) {
        (result as PromiseLike).then(value => future.resolve(value));
      } else {
        future.resolve(result as T);
      }
    }
  }

  private reject(error): void {
    if (this.state === States.PENDING) {
      this.state = States.REJECTED;

      if (this.onResolve) {
        const [future] = this.onResolve;
        future.reject(error);
      }

      if (this.onReject) {
        const [future, callback] = this.onReject;
        callback(error);
        future.reject(error);
      }
    }
  }

  public then(callback: ResolveFunction<T>) {
    const future = new Future<T>((resolve, reject) => {});
    this.onResolve = [future, callback];
    return future;
  }

  public catch(callback: RejectFunction) {
    const future = new Future<T>((resolve, reject) => {});
    this.onReject = [future, callback];
    return future;
  }
}
