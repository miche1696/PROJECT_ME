import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
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

const MarkdownEditor = forwardRef(({ initialContent, content, onChange, mode }, ref) => {
  const editorRef = useRef(null);
  const textareaRef = useRef(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    insertText: (text) => {
      if (mode === 'source' && textareaRef.current) {
        // Source mode - insert into textarea
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = content.substring(0, start);
        const after = content.substring(end);
        const newContent = before + text + after;
        onChange(newContent);
        // Restore cursor position after insertion
        setTimeout(() => {
          textarea.selectionStart = start + text.length;
          textarea.selectionEnd = start + text.length;
          textarea.focus();
        }, 0);
      } else if (mode === 'render' && editorRef.current) {
        // Render mode - insert into MDXEditor
        // Get content before insertion to compare
        const contentBefore = editorRef.current.getMarkdown();
        editorRef.current.insertMarkdown(text);

        // Check if insertion worked (content changed)
        // Use setTimeout to allow MDXEditor to update
        setTimeout(() => {
          const contentAfter = editorRef.current.getMarkdown();
          if (contentAfter === contentBefore) {
            // Insertion didn't work (no cursor position), append to end
            const newContent = (content || '') + text;
            onChange(newContent);
            editorRef.current.setMarkdown(newContent);
          }
        }, 50);
      } else {
        // Fallback: append to end if no editor ref available
        const newContent = (content || '') + text;
        onChange(newContent);
      }
    },
    replaceText: (oldText, newText) => {
      const newContent = content.replace(oldText, newText);
      onChange(newContent);
      if (mode === 'render' && editorRef.current) {
        editorRef.current.setMarkdown(newContent);
      }
    },
    getContent: () => content,
  }), [mode, content, onChange]);

  // Sync content to MDXEditor when it changes externally
  // BUT: skip syncing if the editor's current content matches initialContent
  // This prevents stale parent content from overwriting the correct initial state
  useEffect(() => {
    if (mode === 'render' && editorRef.current) {
      const currentMarkdown = editorRef.current.getMarkdown();

      // Skip sync if editor has initialContent but parent's content is stale (different from initialContent)
      // This happens right after remount when parent state hasn't caught up yet
      if (currentMarkdown === (initialContent || '') && content !== initialContent) {
        return;
      }

      if (currentMarkdown !== content) {
        editorRef.current.setMarkdown(content || '');
      }
    }
  }, [content, mode, initialContent]);

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
  // Use initialContent for MDXEditor's markdown prop (used on mount)
  // The content prop is used for syncing via useEffect after edits
  return (
    <div className="markdown-editor render-mode">
      <div className="mdx-editor-scroll-wrapper">
        <MDXEditor
          ref={editorRef}
          className="mdx-editor-root"
          markdown={initialContent !== undefined ? initialContent : (content || '')}
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
    </div>
  );
});

export default MarkdownEditor;
