import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { 
  FileCode, 
  Upload, 
  ArrowRightLeft, 
  Type, 
  Files, 
  Trash2, 
  Settings as SettingsIcon,
  ChevronRight,
  FileText,
  X,
  Languages,
  Check,
  FolderOpen
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import './App.css';

// --- Localization ---
const translations = {
  en: {
    fileCompare: 'File Compare',
    textCompare: 'Text Compare',
    home: 'Home',
    files: 'Files',
    paste: 'Paste',
    swap: 'Swap',
    clear: 'Clear',
    leftLabel: 'LEFT (Original)',
    rightLabel: 'RIGHT (Modified)',
    chooseFile: 'Open File...',
    readyTitle: 'Ready to Compare',
    readyDescFile: 'Select two files from your computer to see what changed.',
    readyDescPaste: 'Type or paste text directly into the editors below to compare.',
    selectFirst: 'Select First File',
    mode: 'Mode',
    engine: 'Engine',
    readyStatus: 'Ready',
    settings: 'Settings',
    language: 'Language',
    close: 'Close',
    done: 'Done'
  },
  zh: {
    fileCompare: '文件对比',
    textCompare: '文本对比',
    home: '首页',
    files: '文件模式',
    paste: '文本模式',
    swap: '左右对调',
    clear: '清空',
    leftLabel: '左侧 (原始)',
    rightLabel: '右侧 (修改后)',
    chooseFile: '打开文件...',
    readyTitle: '准备就绪',
    readyDescFile: '从您的电脑选择两个文件以查看差异。',
    readyDescPaste: '直接在下方编辑器中输入或粘贴文本进行对比分析。',
    selectFirst: '选择第一个文件',
    mode: '模式',
    engine: '引擎',
    readyStatus: '运行中',
    settings: '设置',
    language: '语言',
    close: '关闭',
    done: '完成'
  }
};

interface FileData {
  name: string;
  path: string;
  content: string;
}

function App() {
  const [original, setOriginal] = useState<FileData>({ name: '', path: '', content: '' });
  const [modified, setModified] = useState<FileData>({ name: '', path: '', content: '' });
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [lang, setLang] = useState<'en' | 'zh'>('zh');
  const [showSettings, setShowSettings] = useState(false);
  
  const diffEditorRef = useRef<any>(null);

  const t = useMemo(() => translations[lang], [lang]);

  const handleSelectFile = async (side: 'original' | 'modified') => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'All Files',
          extensions: ['*']
        }]
      });
      
      if (selected && typeof selected === 'string') {
        const content = await readTextFile(selected);
        const name = selected.split(/[\\/]/).pop() || selected;
        const data = { name, path: selected, content };
        if (side === 'original') {
          setOriginal(data);
          if (diffEditorRef.current) diffEditorRef.current.getOriginalEditor().setValue(content);
        } else {
          setModified(data);
          if (diffEditorRef.current) diffEditorRef.current.getModifiedEditor().setValue(content);
        }
      }
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  const handleSwap = () => {
    if (!diffEditorRef.current) return;
    
    const leftVal = diffEditorRef.current.getOriginalEditor().getValue();
    const rightVal = diffEditorRef.current.getModifiedEditor().getValue();
    
    const tempOriginal = { ...original, content: rightVal };
    const tempModified = { ...modified, content: leftVal };
    
    setOriginal(tempOriginal);
    setModified(tempModified);

    diffEditorRef.current.getOriginalEditor().setValue(rightVal);
    diffEditorRef.current.getModifiedEditor().setValue(leftVal);
  };

  const handleClear = () => {
    setOriginal({ name: '', path: '', content: '' });
    setModified({ name: '', path: '', content: '' });
    if (diffEditorRef.current) {
      diffEditorRef.current.getOriginalEditor().setValue('');
      diffEditorRef.current.getModifiedEditor().setValue('');
    }
  };

  const handleEditorMount = (editor: any) => {
    diffEditorRef.current = editor;
    editor.getOriginalEditor().setValue(original.content);
    editor.getModifiedEditor().setValue(modified.content);
    editor.getOriginalEditor().updateOptions({ readOnly: mode === 'file' });
    editor.getModifiedEditor().updateOptions({ readOnly: mode === 'file' });
  };

  useEffect(() => {
    if (diffEditorRef.current) {
      diffEditorRef.current.getOriginalEditor().updateOptions({ readOnly: mode === 'file' });
      diffEditorRef.current.getModifiedEditor().updateOptions({ readOnly: mode === 'file' });
    }
  }, [mode]);

  return (
    <div className="app-container">
      {/* Sidebar/Nav */}
      <nav className="side-nav">
        <div className="nav-logo" title="FileComparator">
          <div className="custom-logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4V20H20V4H4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M9 8H15M9 12H15M9 16H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M18 18L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <div className="nav-items">
          <button 
            className={`nav-item ${mode === 'file' ? 'active' : ''}`} 
            onClick={() => { setMode('file'); handleClear(); }}
            title={t.fileCompare}
          >
            <Files size={20} />
          </button>
          <button 
            className={`nav-item ${mode === 'paste' ? 'active' : ''}`} 
            onClick={() => { setMode('paste'); handleClear(); }}
            title={t.textCompare}
          >
            <Type size={20} />
          </button>
        </div>
        <div className="nav-footer">
          <button className={`nav-item ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(true)} title={t.settings}>
            <SettingsIcon size={20} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <header className="app-header">
          <div className="header-title">
            <h1>{mode === 'file' ? t.fileCompare : t.textCompare}</h1>
          </div>
          
          <div className="header-actions">
            <button className="action-btn" onClick={handleSwap}>
              <ArrowRightLeft size={16} />
              {t.swap}
            </button>
            <button className="action-btn danger" onClick={handleClear}>
              <Trash2 size={16} />
              {t.clear}
            </button>
          </div>
        </header>

        {/* Integrated Pane Headers */}
        <div className="pane-headers">
          <div className="pane-header-item">
            <div className="pane-label">
              <FileText size={12} />
              <span>{t.leftLabel}</span>
            </div>
            {mode === 'file' && (
              <div className="pane-file-info" onClick={() => handleSelectFile('original')}>
                <FolderOpen size={14} className="icon-blue" />
                <span className="pane-file-name" title={original.path}>{original.name || t.chooseFile}</span>
              </div>
            )}
          </div>
          <div className="pane-header-item">
            <div className="pane-label">
              <FileText size={12} />
              <span>{t.rightLabel}</span>
            </div>
            {mode === 'file' && (
              <div className="pane-file-info" onClick={() => handleSelectFile('modified')}>
                <FolderOpen size={14} className="icon-blue" />
                <span className="pane-file-name" title={modified.path}>{modified.name || t.chooseFile}</span>
              </div>
            )}
          </div>
        </div>

        <div className="editor-wrapper">
          <div className="editor-inner">
            <DiffEditor
              height="100%"
              language="plaintext"
              theme="vs-light"
              onMount={handleEditorMount}
              options={{
                renderSideBySide: true,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontSize: 13,
                fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
                padding: { top: 10, bottom: 10 },
                originalEditable: true,
              }}
            />
          </div>
        </div>

        <footer className="app-footer">
          <div className="status-item">
            <strong>{t.mode}:</strong> {mode.toUpperCase()}
          </div>
          <div className="status-divider" />
          <div className="status-item">
            <strong>{t.engine}:</strong> Monaco Diff
          </div>
          <div className="status-spacer" />
          <div className="status-item success">
            {t.readyStatus}
          </div>
        </footer>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">
                <SettingsIcon size={18} />
                <h2>{t.settings}</h2>
              </div>
              <button className="close-btn" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <section className="settings-section">
                <div className="section-header">
                  <Languages size={16} />
                  <h3>{t.language}</h3>
                </div>
                <div className="language-options">
                  <button 
                    className={`lang-opt ${lang === 'zh' ? 'selected' : ''}`}
                    onClick={() => setLang('zh')}
                  >
                    <span>中文 (简体)</span>
                    {lang === 'zh' && <Check size={16} />}
                  </button>
                  <button 
                    className={`lang-opt ${lang === 'en' ? 'selected' : ''}`}
                    onClick={() => setLang('en')}
                  >
                    <span>English</span>
                    {lang === 'en' && <Check size={16} />}
                  </button>
                </div>
              </section>
            </div>
            <div className="modal-footer">
              <button className="primary-btn" onClick={() => setShowSettings(false)}>
                {t.done}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
