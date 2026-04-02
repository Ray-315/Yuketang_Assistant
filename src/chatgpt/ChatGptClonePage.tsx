import { useEffect, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  Bot,
  ChevronDown,
  Ellipsis,
  FolderPlus,
  Library,
  Mic,
  PanelLeft,
  Pencil,
  Plus,
  Search,
  Share,
  Workflow,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SidebarItem = {
  label: string;
  icon: typeof Pencil;
};

type ProjectItem = {
  name: string;
  muted?: boolean;
};

const sidebarTools: SidebarItem[] = [
  { label: "新聊天", icon: Pencil },
  { label: "搜索聊天", icon: Search },
  { label: "图片", icon: BookOpen },
  { label: "库", icon: Library },
  { label: "应用", icon: Workflow },
  { label: "Codex", icon: Bot },
];

const gpts: ProjectItem[] = [
  { name: "吹牛" },
  { name: "HTML + CSS + Javascript" },
  { name: "探索 GPT" },
];

const projects: ProjectItem[] = [
  { name: "新项目" },
  { name: "复试" },
  { name: "MCLRP" },
  { name: "毕设" },
  { name: "数学物理方程" },
  { name: "数值代数", muted: true },
];

export function useChatGptMode() {
  const [enabled, setEnabled] = useState(() => window.location.hash === "#chatgpt");

  useEffect(() => {
    const onHashChange = () => setEnabled(window.location.hash === "#chatgpt");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return enabled;
}

export function ChatGptClonePage() {
  const [draft, setDraft] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <main className="chatgpt-shell">
      <div className="chatgpt-app">
        <aside className={cn("chatgpt-sidebar", !sidebarOpen && "chatgpt-sidebar-collapsed")}>
          <div className="chatgpt-sidebar-head">
            <button type="button" className="chatgpt-logo-button">
              <div className="chatgpt-logo-mark">
                <Bot size={18} />
              </div>
            </button>
            <Button variant="ghost" size="icon" className="chatgpt-control-button" onClick={() => setSidebarOpen(false)}>
              <PanelLeft />
            </Button>
          </div>

          <nav className="chatgpt-sidebar-nav">
            {sidebarTools.map((item) => (
              <button key={item.label} type="button" className="chatgpt-sidebar-link">
                <item.icon size={21} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <ScrollArea className="chatgpt-sidebar-scroll">
            <section className="chatgpt-sidebar-group">
              <p className="chatgpt-sidebar-title">GPT</p>
              {gpts.map((item) => (
                <button key={item.name} type="button" className="chatgpt-project-link">
                  <div className="chatgpt-project-icon">
                    <Bot size={15} />
                  </div>
                  <span>{item.name}</span>
                </button>
              ))}
            </section>

            <section className="chatgpt-sidebar-group">
              <div className="chatgpt-sidebar-title-row">
                <p className="chatgpt-sidebar-title">项目</p>
                <FolderPlus size={15} />
              </div>
              {projects.map((item) => (
                <button key={item.name} type="button" className={cn("chatgpt-project-link", item.muted && "is-muted")}>
                  <div className="chatgpt-project-icon folder">
                    <BookOpen size={15} />
                  </div>
                  <span>{item.name}</span>
                </button>
              ))}
            </section>
          </ScrollArea>

          <div className="chatgpt-user-card">
            <Avatar className="chatgpt-user-avatar">
              <AvatarFallback>RA</AvatarFallback>
            </Avatar>
            <div className="chatgpt-user-copy">
              <strong>韩Ray</strong>
              <span>Plus</span>
            </div>
          </div>
        </aside>

        <section className="chatgpt-main">
          <header className="chatgpt-topbar">
            <div className="chatgpt-topbar-left">
              {!sidebarOpen ? (
                <Button variant="ghost" size="icon" className="chatgpt-control-button" onClick={() => setSidebarOpen(true)}>
                  <PanelLeft />
                </Button>
              ) : null}
              <button type="button" className="chatgpt-model-button">
                <span>ChatGPT</span>
                <ChevronDown size={18} />
              </button>
            </div>
            <div className="chatgpt-topbar-right">
              <button type="button" className="chatgpt-action-link">
                <Share size={19} />
                <span>分享</span>
              </button>
              <Button variant="ghost" size="icon" className="chatgpt-control-button">
                <Ellipsis />
              </Button>
            </div>
          </header>

          <ScrollArea className="chatgpt-content">
            <div className="chatgpt-thread">
              <div className="chatgpt-user-prompt-row">
                <div className="chatgpt-user-pill">rust语言语法</div>
              </div>

              <article className="chatgpt-answer">
                <p>Rust 语法可以理解成一句话：</p>
                <p className="chatgpt-answer-strong">它是一门“像 C/C++ 一样高性能、但更强调安全和规范”的语言。</p>
                <p>
                  你这个问题比较大，我直接给你一套 Rust 语法入门总览，把最常用的核心语法一次讲完。你看完基本就能读代码、写简单程序了。
                </p>

                <hr className="chatgpt-divider" />

                <h2>一、最基础的程序结构</h2>

                <div className="chatgpt-codeblock">
                  <div className="chatgpt-codeblock-head">
                    <div className="chatgpt-codeblock-title">
                      <span>{"</>"}</span>
                      <strong>Rust</strong>
                    </div>
                    <button type="button" className="chatgpt-copy-button">
                      复制
                    </button>
                  </div>
                  <pre>
                    <code>{`fn main() {
    println!("Hello, Rust!");
}`}</code>
                  </pre>
                </div>

                <div className="chatgpt-bullet-copy">
                  <p>说明：</p>
                  <ul>
                    <li><code>fn</code>：定义函数</li>
                    <li><code>main</code>：程序入口函数</li>
                    <li><code>{`{}`}</code>：代码块</li>
                    <li><code>println!</code>：输出宏，<code>!</code> 表示这是宏，不是普通函数</li>
                    <li>每条语句通常以 <code>;</code> 结尾</li>
                  </ul>
                </div>
              </article>
            </div>
          </ScrollArea>

          <div className="chatgpt-composer-zone">
            <div className="chatgpt-composer">
              <Button variant="ghost" size="icon" className="chatgpt-composer-plus">
                <Plus />
              </Button>
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="有问题，尽管问"
                className="chatgpt-composer-input"
              />
              <div className="chatgpt-composer-actions">
                <Button variant="ghost" size="icon" className="chatgpt-composer-icon">
                  <Mic />
                </Button>
                <Button size="icon" className="chatgpt-voice-pill" disabled={!draft.trim()}>
                  <ArrowUp />
                </Button>
              </div>
            </div>
            <p className="chatgpt-footnote">ChatGPT 也可能会犯错。请核查重要信息。</p>
          </div>
        </section>
      </div>
    </main>
  );
}
