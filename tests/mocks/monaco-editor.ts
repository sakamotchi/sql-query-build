const editorInstance = {
  getValue: () => '',
  setValue: () => {},
  addAction: () => {},
  getSelection: () => null,
  getModel: () => null,
  onDidChangeModelContent: () => ({ dispose: () => {} }),
  onDidChangeCursorSelection: () => ({ dispose: () => {} }),
  deltaDecorations: () => [],
  dispose: () => {},
}

export const editor = {
  create: () => editorInstance,
  setTheme: () => {},
}

export const KeyMod = {
  CtrlCmd: 1,
}

export const KeyCode = {
  Enter: 3,
  Escape: 9,
}

export class Range {
  constructor(
    public startLineNumber: number,
    public startColumn: number,
    public endLineNumber: number,
    public endColumn: number
  ) {}
}
