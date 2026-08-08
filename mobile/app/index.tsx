import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "@/lib/session";

export default function Index() {
  const { session, workspaceReady, role, platformRole, loading } = useSession();
  if (loading)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#e43f2c" />
      </View>
    );
  const authenticatedHome = role === "inspector" ? "/inspection-readiness" : "/dashboard";
  if (session && platformRole) return <Redirect href="/platform-access" />;
  return (
    <Redirect href={session ? (workspaceReady ? authenticatedHome : "/onboarding") : "/login"} />
  );
}
