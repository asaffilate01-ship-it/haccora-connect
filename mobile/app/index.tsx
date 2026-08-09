import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "@/lib/session";

export default function Index() {
  const { session, workspaceReady, role, platformRole, serviceStatus, loading } = useSession();
  if (loading)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#e43f2c" />
      </View>
    );
  const authenticatedHome = role === "inspector" ? "/inspection-readiness" : "/dashboard";
  if (session && platformRole) return <Redirect href="/platform-access" />;
  if (session && workspaceReady && serviceStatus !== "active") {
    return <Redirect href="/account-status" />;
  }
  return (
    <Redirect href={session ? (workspaceReady ? authenticatedHome : "/onboarding") : "/login"} />
  );
}
