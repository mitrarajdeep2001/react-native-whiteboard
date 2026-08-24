import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";

// This is the native entry point — web uses index.web.tsx instead
export function App() {
  const ctx = require.context("./src/app");
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
