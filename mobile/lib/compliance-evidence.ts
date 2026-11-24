import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

type EvidenceState<T> =
  | { status: "loading"; data: null }
  | { status: "error"; data: null }
  | { status: "ready"; data: T };

/** Read fresh evidence on focus; never retain a failed or superseded response. */
export function useComplianceEvidence<T>(load: () => Promise<T>) {
  const [state, setState] = useState<EvidenceState<T>>({ status: "loading", data: null });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => {
    setState({ status: "loading", data: null });
    setRevision((value) => value + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setState({ status: "loading", data: null });
      void Promise.resolve()
        .then(load)
        .then((data) => {
          if (active) setState({ status: "ready", data });
        })
        .catch(() => {
          if (active) setState({ status: "error", data: null });
        });
      return () => {
        active = false;
      };
    }, [load, revision]),
  );

  return { ...state, refresh };
}
