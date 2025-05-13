import { useEffect, useRef } from "react";

/**
 * A custom hook that runs a callback function at a specified interval
 *
 * @param callback The function to call on each interval
 * @param delay The interval delay in milliseconds, or null to pause the interval
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    // Don't schedule if delay is null
    if (delay === null) return;

    const id = setInterval(() => {
      savedCallback.current();
    }, delay);

    // Clean up on unmount or when delay changes
    return () => clearInterval(id);
  }, [delay]);
}
