const editorInstance = {
  getValue: () => '',
  setValue: () => {},
  onDidChangeModelContent: () => ({ dispose: () => {} }),
  dispose: () => {},
}

export const editor = {
  create: () => editorInstance,
  setTheme: () => {},
}
