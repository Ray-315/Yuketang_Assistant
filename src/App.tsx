import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { ZenWorkbench } from "./ZenWorkbench";
import { MacWorkbench } from "./macos/MacWorkbench";
import { useAppStore, useScopedData } from "./store/appStore";
import type { SessionSnapshot } from "../shared/models";
import { ShowcasePage, useShowcaseMode } from "./pages/ShowcasePage";
import { ChatGptClonePage, useChatGptMode } from "./chatgpt/ChatGptClonePage";

export default function App() {
  const store = useScopedData();
  const showcaseMode = useShowcaseMode();
  const chatGptMode = useChatGptMode();

  useEffect(() => { void store.initialize(); }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<SessionSnapshot>("session-updated", (event) => {
      useAppStore.setState({ session: event.payload });
    }).then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, []);

  if (store.loading) {
    return <main className="app-shell"><section className="loading-panel">正在初始化本地工作台…</section></main>;
  }

  const handleSettingsChange = (settings: typeof store.settings) => {
    useAppStore.setState({ settings });
  };

  if (showcaseMode) {
    return <ShowcasePage />;
  }

  if (chatGptMode) {
    return <ChatGptClonePage />;
  }

  return store.settings.uiMode === "flat"
    ? <MacWorkbench onSettingsChange={handleSettingsChange} />
    : <ZenWorkbench onSettingsChange={handleSettingsChange} />;
}
