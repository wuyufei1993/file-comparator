import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { OnMount } from "@monaco-editor/react";
import type { editor, IDisposable } from "monaco-editor";
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  Check,
  FolderOpen,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Settings2,
  Trash2,
  Undo2,
  WrapText,
  X,
} from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile, stat } from "@tauri-apps/plugin-fs";
import "./App.css";

const DiffEditor = lazy(() => import("./ComparisonEditor"));

const translations = {
  zh: {
    comparison: "内容对比",
    settings: "偏好设置",
    original: "原始内容",
    modified: "修改内容",
    select: "选择文件",
    replace: "更换文件",
    uploadNote: "UTF-8 文本文件 · 最大 10 MB",
    inputHint: "在此输入、粘贴文本，或选择上方文件",
    swap: "左右对调",
    clear: "清空内容",
    undo: "撤销",
    cleared: "内容已清空",
    whitespace: "忽略行首尾空格",
    wrap: "自动换行",
    previous: "上一处差异",
    next: "下一处差异",
    changes: "处差异",
    added: "新增",
    removed: "删除",
    lines: "行",
    ready: "输入文本或选择文件开始对比",
    same: "两侧内容一致",
    computing: "正在计算差异",
    language: "界面语言",
    fontSize: "字号",
    minimap: "显示缩略图",
    load: "正在加载编辑器…",
    reading: "正在读取文件…",
    error: "无法读取文件，请确认文件为 UTF-8 文本且可访问。",
    tooLarge: "文件超过 10 MB，请选择较小的文本文件。",
    binary: "暂不支持二进制文件，请选择 UTF-8 文本文件。",
    close: "关闭",
    minimize: "最小化",
    maximize: "最大化",
    restoreWindow: "还原窗口",
    windowError: "窗口操作失败，请重试。",
  },
  en: {
    comparison: "Content comparison",
    settings: "Preferences",
    original: "Original",
    modified: "Modified",
    select: "Choose file",
    replace: "Replace file",
    uploadNote: "UTF-8 text files · Up to 10 MB",
    inputHint: "Type or paste text here, or choose a file above",
    swap: "Swap sides",
    clear: "Clear all",
    undo: "Undo",
    cleared: "Content cleared",
    whitespace: "Ignore edge whitespace",
    wrap: "Word wrap",
    previous: "Previous difference",
    next: "Next difference",
    changes: "differences",
    added: "Added",
    removed: "Removed",
    lines: "lines",
    ready: "Enter text or choose files to compare",
    same: "Both sides are identical",
    computing: "Calculating differences",
    language: "Interface language",
    fontSize: "Font size",
    minimap: "Show minimap",
    load: "Loading editor…",
    reading: "Reading file…",
    error: "Unable to read this file. Check access and UTF-8 encoding.",
    tooLarge: "This file exceeds 10 MB. Please choose a smaller text file.",
    binary: "Binary files are not supported. Please choose a UTF-8 text file.",
    close: "Close",
    minimize: "Minimize",
    maximize: "Maximize",
    restoreWindow: "Restore window",
    windowError: "Window action failed. Please try again.",
  },
};
type Lang = keyof typeof translations;
type Side = "original" | "modified";
interface FileData {
  name: string;
  path: string;
  content: string;
}
type Session = Record<Side, FileData>;
interface Preferences {
  lang: Lang;
  wrap: boolean;
  ignoreWhitespace: boolean;
  minimap: boolean;
  fontSize: number;
}
const emptyFile = (): FileData => ({ name: "", path: "", content: "" });
const emptySession = (): Session => ({
  original: emptyFile(),
  modified: emptyFile(),
});
const defaultPreferences: Preferences = {
  lang: "zh",
  wrap: false,
  ignoreWhitespace: false,
  minimap: true,
  fontSize: 14,
};
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 100;
const isValidFontSize = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= MIN_FONT_SIZE &&
  value <= MAX_FONT_SIZE;
function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(
      localStorage.getItem("file-comparator.preferences") || "{}",
    );
    return {
      lang: saved.lang === "en" ? "en" : "zh",
      wrap: saved.wrap === true,
      ignoreWhitespace: saved.ignoreWhitespace === true,
      minimap:
        typeof saved.minimap === "boolean"
          ? saved.minimap
          : defaultPreferences.minimap,
      fontSize: isValidFontSize(saved.fontSize)
        ? saved.fontSize
        : defaultPreferences.fontSize,
    };
  } catch {
    return defaultPreferences;
  }
}
const lineCount = (value: string) =>
  value ? value.split(/\r\n|\r|\n/).length : 0;

function App() {
  const [session, setSession] = useState<Session>(emptySession);
  const [maximized, setMaximized] = useState(false);
  const [preferences, setPreferences] = useState(readPreferences);
  const [fontSizeInput, setFontSizeInput] = useState(() =>
    String(preferences.fontSize),
  );
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState<Side | null>(null);
  const [error, setError] = useState("");
  const [undo, setUndo] = useState<Session | null>(null);
  const [summary, setSummary] = useState({
    changes: 0,
    added: 0,
    removed: 0,
    original: "",
    modified: "",
    ignoreWhitespace: false,
  });
  const diffRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const listeners = useRef<IDisposable[]>([]);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const pickerSide = useRef<Side>("original");
  const t = translations[preferences.lang];
  const hasContent = !!(
    session.original.content ||
    session.modified.content ||
    session.original.name ||
    session.modified.name
  );
  const canCompare = hasContent;
  const pending =
    canCompare &&
    (summary.original !== session.original.content ||
      summary.modified !== session.modified.content ||
      summary.ignoreWhitespace !== preferences.ignoreWhitespace);

  useEffect(() => {
    try {
      localStorage.setItem(
        "file-comparator.preferences",
        JSON.stringify(preferences),
      );
    } catch {
      /* Keep preferences in memory when storage is unavailable. */
    }
    document.documentElement.lang = preferences.lang === "zh" ? "zh-CN" : "en";
  }, [preferences]);
  useEffect(() => {
    if (showSettings) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [showSettings]);
  useEffect(() => {
    if (!isTauri()) return;
    const appWindow = getCurrentWindow();
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const updateMaximized = async () => {
      const value = await appWindow.isMaximized();
      if (!disposed) setMaximized(value);
    };
    void updateMaximized().catch(console.error);
    void appWindow.onResized(() => {
      void updateMaximized().catch(console.error);
    }).then((cleanup) => {
      if (disposed) cleanup();
      else unlisten = cleanup;
    }).catch(console.error);
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
  useEffect(
    () => () => {
      listeners.current.forEach((listener) => listener.dispose());
    },
    [],
  );

  const updatePreference = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => setPreferences((previous) => ({ ...previous, [key]: value }));
  const windowAction = async (action: "minimize" | "toggleMaximize" | "close") => {
    try {
      await getCurrentWindow()[action]();
    } catch {
      setError(t.windowError);
    }
  };
  const storeFile = (
    side: Side,
    name: string,
    path: string,
    bytes: Uint8Array,
  ) => {
    if (bytes.byteLength > 10 * 1024 * 1024) throw new Error(t.tooLarge);
    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (content.includes("\0")) throw new Error();
    } catch {
      throw new Error(t.binary);
    }
    setSession((previous) => ({
      ...previous,
      [side]: { name, path, content },
    }));
    setUndo(null);
  };
  const selectFile = async (side: Side) => {
    if (busy) return;
    setError("");
    if (!isTauri()) {
      pickerSide.current = side;
      pickerRef.current?.click();
      return;
    }
    setBusy(side);
    try {
      const path = await open({ multiple: false, directory: false });
      if (typeof path === "string") {
        if ((await stat(path)).size > 10 * 1024 * 1024)
          throw new Error(t.tooLarge);
        storeFile(
          side,
          path.split(/[\\/]/).pop() || path,
          path,
          await readFile(path),
        );
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
    } finally {
      setBusy(null);
    }
  };
  const loadBrowserFile = async (file?: File) => {
    if (!file) return;
    const side = pickerSide.current;
    setBusy(side);
    setError("");
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error(t.tooLarge);
      storeFile(
        side,
        file.name,
        file.name,
        new Uint8Array(await file.arrayBuffer()),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
    } finally {
      setBusy(null);
    }
  };
  const swap = () => {
    setSession((previous) => ({
      original: previous.modified,
      modified: previous.original,
    }));
    setUndo(null);
  };
  const clear = () => {
    setUndo(session);
    setSession(emptySession());
    setError("");
  };
  const restore = () => {
    if (!undo) return;
    setSession(undo);
    setUndo(null);
  };
  const onMount = (
    instance: editor.IStandaloneDiffEditor,
    monaco: Parameters<OnMount>[1],
  ) => {
    listeners.current.forEach((listener) => listener.dispose());
    diffRef.current = instance;
    const updateSummary = () => {
      const changes = instance.getLineChanges();
      if (!changes) return;
      setSummary({
        changes: changes.length,
        added: changes.reduce(
          (sum, change) =>
            sum +
            (change.modifiedEndLineNumber === 0
              ? 0
              : change.modifiedEndLineNumber -
                change.modifiedStartLineNumber +
                1),
          0,
        ),
        removed: changes.reduce(
          (sum, change) =>
            sum +
            (change.originalEndLineNumber === 0
              ? 0
              : change.originalEndLineNumber -
                change.originalStartLineNumber +
                1),
          0,
        ),
        original: instance.getOriginalEditor().getValue(),
        modified: instance.getModifiedEditor().getValue(),
        ignoreWhitespace: preferencesRef.current.ignoreWhitespace,
      });
    };
    listeners.current = [
      instance.onDidUpdateDiff(updateSummary),
      ...(["original", "modified"] as Side[]).map((side) => {
        const pane =
          side === "original"
            ? instance.getOriginalEditor()
            : instance.getModifiedEditor();
        pane.addAction({
          id: `next-difference-${side}`,
          label: "Next difference",
          keybindings: [monaco.KeyCode.F7],
          run: () => instance.goToDiff("next"),
        });
        pane.addAction({
          id: `previous-difference-${side}`,
          label: "Previous difference",
          keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.F7],
          run: () => instance.goToDiff("previous"),
        });
        return pane.onDidChangeModelContent(() => {
          const content = pane.getValue();
          if (content === sessionRef.current[side].content) return;
          setUndo(null);
          setSession((previous) =>
            previous[side].content === content
              ? previous
              : {
                  ...previous,
                  [side]: { ...previous[side], content },
                },
          );
        });
      }),
    ];
    updateSummary();
  };
  const status = !canCompare
    ? t.ready
    : pending
      ? t.computing
      : summary.changes === 0
        ? t.same
        : `${summary.changes} ${preferences.lang === "en" && summary.changes === 1 ? "difference" : t.changes}`;
  const language =
    session.original.name.endsWith(".json") ||
    session.modified.name.endsWith(".json")
      ? "json"
      : "plaintext";

  return (
    <div className="app-shell">
      <header className={`toolbar ${isTauri() ? "desktop-toolbar" : ""}`} data-tauri-drag-region>
        <div className="brand" data-tauri-drag-region>
          <img src="./logo.svg" width="28" height="28" alt="" draggable={false} data-tauri-drag-region />
          <strong data-tauri-drag-region>FileComparator</strong>
        </div>
        <div className="toolbar-drag-space" data-tauri-drag-region />
        <div className="toolbar-actions">
          <button
            className="text-button"
            aria-label={t.swap}
            title={t.swap}
            onClick={swap}
            disabled={!hasContent || !!busy}
          >
            <ArrowRightLeft size={16} />
            <span>{t.swap}</span>
          </button>
          <button
            className="text-button danger"
            aria-label={t.clear}
            title={t.clear}
            onClick={clear}
            disabled={!hasContent || !!busy}
          >
            <Trash2 size={16} />
            <span>{t.clear}</span>
          </button>
          <button
            className="icon-button"
            aria-label={t.settings}
            title={t.settings}
            onClick={() => setShowSettings(true)}
          >
            <Settings2 size={17} />
          </button>
        </div>
        {isTauri() && (
          <div className="window-controls">
            <button className="window-button" title={t.minimize} aria-label={t.minimize} onClick={() => void windowAction("minimize")}>
              <Minus size={16} />
            </button>
            <button className="window-button" title={maximized ? t.restoreWindow : t.maximize} aria-label={maximized ? t.restoreWindow : t.maximize} onClick={() => void windowAction("toggleMaximize")}>
              {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button className="window-button window-close" title={t.close} aria-label={t.close} onClick={() => void windowAction("close")}>
              <X size={18} />
            </button>
          </div>
        )}
      </header>
      <main className="comparison" aria-label={t.comparison}>
        <div className="pane-headers">
          {(["original", "modified"] as Side[]).map((side) => (
            <div className="pane-header" key={side}>
              <strong>{t[side]}</strong>
              <span
                className="file-name"
                title={session[side].path || session[side].name}
              >
                {session[side].name}
              </span>
              <span className="line-count">
                {lineCount(session[side].content)} {t.lines}
              </span>
              <button
                className="file-button"
                disabled={!!busy}
                title={t.uploadNote}
                onClick={() => void selectFile(side)}
                aria-label={
                  (session[side].name ? t.replace : t.select) +
                  " · " +
                  t[side]
                }
              >
                {busy === side ? (
                  <Loader2 size={15} className="spin" />
                ) : (
                  <FolderOpen size={15} />
                )}
                <span>{session[side].name ? t.replace : t.select}</span>
              </button>
            </div>
          ))}
        </div>
        <div className="editor-area">
          <Suspense
            fallback={
              <div className="editor-loading">
                <Loader2 className="spin" size={20} />
                {t.load}
              </div>
            }
          >
            <DiffEditor
              original={session.original.content}
              modified={session.modified.content}
              language={language}
              theme="comparison-light"
              beforeMount={(monaco) =>
                monaco.editor.defineTheme("comparison-light", {
                  base: "vs",
                  inherit: true,
                  rules: [],
                  colors: {
                    "editor.background": "#ffffff",
                    "editor.foreground": "#34423e",
                    "editorLineNumber.foreground": "#a4b0aa",
                    "editor.lineHighlightBackground": "#f7faf8",
                    "diffEditor.insertedTextBackground": "#66d99599",
                    "diffEditor.removedTextBackground": "#f47d8999",
                    "diffEditor.insertedLineBackground": "#edf9f1",
                    "diffEditor.removedLineBackground": "#fff1ee",
                    "editorGutter.addedBackground": "#30996b",
                    "editorGutter.deletedBackground": "#d57a6d",
                  },
                })
              }
              onMount={onMount}
              loading={
                <div className="editor-loading">
                  <Loader2 className="spin" size={20} />
                  {t.load}
                </div>
              }
              options={{
                renderSideBySide: true,
                renderMarginRevertIcon: false,
                renderGutterMenu: false,
                originalAriaLabel: t.original,
                modifiedAriaLabel: t.modified,
                useInlineViewWhenSpaceIsLimited: false,
                readOnly: !!busy,
                originalEditable: !busy,
                automaticLayout: true,
                minimap: { enabled: preferences.minimap },
                fontSize: preferences.fontSize,
                fontFamily: "'Cascadia Code', Consolas, monospace",
                lineHeight: Math.max(24, Math.round(preferences.fontSize * 1.5)),
                scrollBeyondLastLine: false,
                padding: { top: 20, bottom: 20 },
                renderLineHighlight: "gutter",
                wordWrap: preferences.wrap ? "on" : "off",
                diffWordWrap: preferences.wrap ? "on" : "off",
                ignoreTrimWhitespace: preferences.ignoreWhitespace,
                renderOverviewRuler: true,
                overviewRulerBorder: false,
                folding: false,
                lineNumbersMinChars: 3,
                glyphMargin: false,
                renderIndicators: true,
                enableSplitViewResizing: false,
                hideUnchangedRegions: { enabled: false },
              }}
            />
          </Suspense>
          <div className="input-hints" aria-hidden="true">
            {(["original", "modified"] as Side[]).map((side) => (
              <span key={side}>{!session[side].content && t.inputHint}</span>
            ))}
          </div>
        </div>
        <div className="comparison-bottom">
          <div className="display-options">
            <label>
              <input
                type="checkbox"
                checked={preferences.ignoreWhitespace}
                onChange={(event) =>
                  updatePreference("ignoreWhitespace", event.target.checked)
                }
              />
              {t.whitespace}
            </label>
            <button
              className={`option-button ${preferences.wrap ? "selected" : ""}`}
              aria-label={t.wrap}
              title={t.wrap}
              aria-pressed={preferences.wrap}
              onClick={() => updatePreference("wrap", !preferences.wrap)}
            >
              <WrapText size={16} />
              {t.wrap}
            </button>
          </div>
          <div className="diff-navigation">
            {canCompare && !pending && summary.changes > 0 && (
              <span className="diff-stats" title={t.added + " / " + t.removed}>
                <span className="added">+{summary.added}</span>
                <span className="removed">−{summary.removed}</span>
              </span>
            )}
            <span
              className={
                canCompare && !pending && summary.changes === 0
                  ? "identical"
                  : ""
              }
            >
              {busy ? t.reading : status}
            </span>
            <button
              className="icon-button"
              title={`${t.previous} (Shift+F7)`}
              aria-label={t.previous}
              disabled={!canCompare || pending || !summary.changes}
              onClick={() => diffRef.current?.goToDiff("previous")}
            >
              <ArrowUp size={16} />
            </button>
            <button
              className="icon-button"
              title={`${t.next} (F7)`}
              aria-label={t.next}
              disabled={!canCompare || pending || !summary.changes}
              onClick={() => diffRef.current?.goToDiff("next")}
            >
              <ArrowDown size={16} />
            </button>
          </div>
        </div>
      </main>
      <input
        className="hidden-input"
        type="file"
        ref={pickerRef}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void loadBrowserFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {(error || undo) && (
        <div
          className={`toast ${error ? "error" : ""}`}
          role={error ? "alert" : "status"}
        >
          {error ? <X size={17} /> : <Check size={17} />}
          <span>{error || t.cleared}</span>
          {undo && !error && (
            <button onClick={restore}>
              <Undo2 size={15} />
              {t.undo}
            </button>
          )}
          <button
            className="icon-button"
            aria-label={t.close}
            onClick={() => {
              setError("");
              setUndo(null);
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className="settings-dialog"
        aria-label={t.settings}
        onCancel={() => setShowSettings(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setShowSettings(false);
        }}
      >
        <header>
          <h2>{t.settings}</h2>
          <button
            className="icon-button"
            aria-label={t.close}
            onClick={() => setShowSettings(false)}
          >
            <X size={18} />
          </button>
        </header>
        <div className="settings-body">
          <label className="settings-row">
            {t.language}
            <select
              value={preferences.lang}
              onChange={(event) =>
                updatePreference("lang", event.target.value as Lang)
              }
            >
              <option value="zh">简体中文</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="settings-row">
            {t.fontSize}
            <span className="font-size-control">
              <input
                type="number"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                step={1}
                value={fontSizeInput}
                onChange={(event) => {
                  setFontSizeInput(event.target.value);
                  const size = event.target.valueAsNumber;
                  if (isValidFontSize(size)) updatePreference("fontSize", size);
                }}
                onBlur={() => setFontSizeInput(String(preferences.fontSize))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
              <span aria-hidden="true">px</span>
            </span>
          </label>
          <label className="settings-row">
            {t.minimap}
            <input
              type="checkbox"
              checked={preferences.minimap}
              onChange={(event) =>
                updatePreference("minimap", event.target.checked)
              }
            />
          </label>
        </div>
      </dialog>
    </div>
  );
}

export default App;
