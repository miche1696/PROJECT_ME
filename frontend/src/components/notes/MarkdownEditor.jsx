import React, { useRef, useEffect, useCallback } from 'react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  thematicBreakPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  ListsToggle,
  InsertTable,
  InsertThematicBreak,
  UndoRedo,
  Separator,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import './MarkdownEditor.css';

const MarkdownEditor = ({ content, onChange, mode }) => {
  const editorRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync content to MDXEditor when it changes externally
  useEffect(() => {
    if (mode === 'render' && editorRef.current) {
      const currentMarkdown = editorRef.current.getMarkdown();
      if (currentMarkdown !== content) {
        editorRef.current.setMarkdown(content || '');
      }
    }
  }, [content, mode]);

  const handleEditorChange = useCallback((newMarkdown) => {
    onChange(newMarkdown);
  }, [onChange]);

  const handleTextareaChange = useCallback((e) => {
    onChange(e.target.value);
  }, [onChange]);

  // Source mode - raw markdown textarea
  if (mode === 'source') {
    return (
      <div className="markdown-editor source-mode">
        <textarea
          ref={textareaRef}
          className="markdown-source-textarea"
          value={content}
          onChange={handleTextareaChange}
          placeholder="Write markdown here..."
          spellCheck="true"
        />
      </div>
    );
  }

  // Render mode - WYSIWYG
  return (
    <div className="markdown-editor render-mode">
      <MDXEditor
        ref={editorRef}
        markdown={content || ''}
        onChange={handleEditorChange}
        contentEditableClassName="mdx-editor-content"
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          tablePlugin(),
          thematicBreakPlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: 'javascript' }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              js: 'JavaScript',
              javascript: 'JavaScript',
              ts: 'TypeScript',
              typescript: 'TypeScript',
              python: 'Python',
              py: 'Python',
              css: 'CSS',
              html: 'HTML',
              json: 'JSON',
              bash: 'Bash',
              sh: 'Shell',
              sql: 'SQL',
              markdown: 'Markdown',
              md: 'Markdown',
              jsx: 'JSX',
              tsx: 'TSX',
              go: 'Go',
              rust: 'Rust',
              java: 'Java',
              c: 'C',
              cpp: 'C++',
              '': 'Plain Text',
            },
          }),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <BoldItalicUnderlineToggles />
                <Separator />
                <ListsToggle />
                <Separator />
                <CreateLink />
                <InsertTable />
                <InsertThematicBreak />
              </>
            ),
          }),
        ]}
      />
    </div>
  );
};

export default MarkdownEditor;
