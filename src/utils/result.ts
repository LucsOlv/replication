export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E extends Error = Error> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E extends Error>(e: E): Err<E> => ({ ok: false, error: e });

export async function tryAsync<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    const base = e instanceof Error ? e : new Error(String(e));
    if (context) {
      base.message = `${context}: ${base.message}`;
    }
    return err(base);
  }
}