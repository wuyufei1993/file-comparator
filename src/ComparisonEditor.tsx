import "./monaco";
import { useEffect, useRef, useState } from "react";
import { DiffEditor, type DiffEditorProps } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

export default function ComparisonEditor({
  original = "",
  onMount,
  ...props
}: DiffEditorProps) {
  const initialOriginal = useRef(original);
  const [instance, setInstance] =
    useState<editor.IStandaloneDiffEditor | null>(null);

  useEffect(() => {
    const model = instance?.getModel()?.original;
    // The upstream original prop calls setValue even for an identical value,
    // resetting the caret and undo history after every keystroke on the left.
    // Only replace the model for an external change (file, swap, clear, restore).
    if (model && model.getValue() !== original) model.setValue(original);
  }, [instance, original]);

  return (
    <DiffEditor
      {...props}
      original={initialOriginal.current}
      onMount={(mountedEditor, monaco) => {
        setInstance(mountedEditor);
        onMount?.(mountedEditor, monaco);
      }}
    />
  );
}
