import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";

type EvidenceState<T> =
  | { status: "loading"; data: null }
  | { status: "error"; data: null }
  | { status: "ready"; data: T };

/** Read only while the screen is focused; retire responses after blur or foreground changes. */
export function useFocusedEvidence<T>(load: (isCurrent: () => boolean) => Promise<T>) {
  const [state, setState] = useState<EvidenceState<T>>({ status: "loading", data: null });
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(() => {
    setState({ status: "loading", data: null });
    setRevision((value) => value + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let requestId = 0;
      const read = async () => {
        const request = ++requestId;
        const isCurrent = () => active && request === requestId;
        setState({ status: "loading", data: null });
        try {
          const data = await load(isCurrent);
          if (isCurrent()) setState({ status: "ready", data });
        } catch {
          if (isCurrent()) setState({ status: "error", data: null });
        }
      };

      const subscription = AppState.addEventListener("change", (next) => {
        if (next === "active") {
          void read();
        } else {
          requestId += 1;
          setState({ status: "loading", data: null });
        }
      });
      if (AppState.currentState !== "background") void read();

      return () => {
        active = false;
        requestId += 1;
        subscription.remove();
        setState({ status: "loading", data: null });
      };
    }, [load, revision]),
  );

  return { ...state, refresh };
}
