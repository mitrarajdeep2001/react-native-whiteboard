import "@expo/metro-runtime";
import { App } from "expo-router/build/qualified-entry";
import { renderRootComponent } from "expo-router/build/renderRootComponent";
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

// Load the Skia WASM before mounting the app.
// canvaskit.wasm is served from /public/canvaskit.wasm by Expo's dev server.
LoadSkiaWeb().then(() => {
  renderRootComponent(App);
});
