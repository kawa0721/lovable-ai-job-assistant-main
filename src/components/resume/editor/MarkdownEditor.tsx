/**
 * マークダウン/リッチテキストエディターコンポーネント
 * 
 * モジュール化されたアーキテクチャでリファクタリング
 * - カスタムフックによる関心の分離
 * - 安全なHTML/マークダウン変換
 * - 改善されたカーソル位置管理
 * - エラーハンドリングの強化
 * - テーブル作成・編集機能の強化
 * - テンプレートプレビュー機能の追加
 * - キーボードショートカットの拡張
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Maximize, Minimize } from 'lucide-react';
import { TableEditingToolbar } from './TableEditingToolbar';
import { KeyboardShortcutsGuide } from './KeyboardShortcutsGuide';
import { EmojiPicker } from './EmojiPicker';
import { FileUpload } from './FileUpload';
import { TemplatePreview } from './TemplatePreview';
import { EnhancedTableWizard } from './EnhancedTableWizard';
import { ResumeTemplatesMenu, resumeTemplates } from './ResumeTemplatesMenu';
import { InsertTableMenu } from './InsertTableMenu';
import { cn } from '../../../lib/utils';

// 型定義
import { EditorMode, MarkdownEditorProps, SaveStatus } from './types';

// カスタムフック
import { useCursorManagement } from './hooks/useCursorManagement';
import { useEditorState } from './hooks/useEditorState';
import { useEditorFeatures } from './hooks/useEditorFeatures';
import { useEditorUI } from './hooks/useEditorUI';

/**
 * マークダウン/リッチテキストエディターコンポーネント
 */
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
  content, 
  onChange, 
  readOnly = false,
  autoFocus = false,
  initialMode = 'rich',
  placeholder = '# マークダウン形式で入力してください'
}) => {
  // refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  // 保存状態
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  
  // カーソル管理フック
  const { 
    handleMarkdownSelect
  } = useCursorManagement();
  
  // Tiptapエディター初期化
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: false,
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-gray-100 p-2 rounded',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-4',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-4',
          },
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-fixed w-full',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2 bg-gray-100',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full rounded-md',
        },
      }),
    ],
    editable: !readOnly,
    content: content,
    autofocus: autoFocus && initialMode === 'rich',
  });
  
  // readOnly属性が変更されたときにエディタの編集可能状態を更新
  useEffect(() => {
    if (editor) {
      console.log("MarkdownEditor - Updating editable status:", !readOnly);
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);
  
  // エディター状態管理フック
  const {
    editMode,
    isProcessingModeChangeRef,
    toggleEditMode,
    richContent,
    markdownText,
    handleRichContentChange,
    handleMarkdownChange
  } = useEditorState({
    editor,
    textareaRef,
    initialContent: content,
    initialMode,
    onContentChange: onChange,
    onSaveStatusChange: setSaveStatus
  });
  
  // UI管理フック
  const {
    isFullscreen,
    toggleFullscreen
  } = useEditorUI({
    editor,
    editMode,
    markdownText,
    toggleEditMode,
    onContentChange: onChange,
    onSaveStatusChange: setSaveStatus
  });
  
  // エディター機能フック
  const {
    handleEmojiSelect,
    handleImageInsert,
    handleTableInsert,
    handleTemplateSelect
  } = useEditorFeatures({
    editor,
    editMode,
    markdownText,
    setMarkdownText: (text) => setMarkdownText(text),
    textareaRef,
    updateRichContent: handleRichContentChange,
    onContentChange: onChange,
    onSaveStatusChange: setSaveStatus
  });
  
  // キーボードショートカットハンドラー
  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    if (!editor) return;
    
    // テーブル関連のショートカット
    if (editMode === 'rich' && editor.isActive('table')) {
      // Alt+右矢印: 現在の列の右に新しい列を追加
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        editor.chain().focus().addColumnAfter().run();
      }
      
      // Alt+左矢印: 現在の列の左に新しい列を追加
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        editor.chain().focus().addColumnBefore().run();
      }
      
      // Alt+上矢印: 現在の行の上に新しい行を追加
      if (event.altKey && event.key === 'ArrowUp') {
        event.preventDefault();
        editor.chain().focus().addRowBefore().run();
      }
      
      // Alt+下矢印: 現在の行の下に新しい行を追加
      if (event.altKey && event.key === 'ArrowDown') {
        event.preventDefault();
        editor.chain().focus().addRowAfter().run();
      }
    }
    
    // Ctrl+Shift+T: テーブル作成ウィザードを開く
    // (実際の実装では、ウィザードを開くためのトリガー状態を設定する必要があります)
    if (event.ctrlKey && event.shiftKey && event.key === 'T') {
      event.preventDefault();
      // ここでテーブルウィザードを開くための状態を設定します
    }
    
    // Ctrl+Shift+1: 基本的な職務経歴書テンプレートを挿入
    if (event.ctrlKey && event.shiftKey && event.key === '1') {
      event.preventDefault();
      handleTemplateSelect(resumeTemplates.basicTemplate);
    }
    
    // Ctrl+Shift+2: プロジェクト実績テンプレートを挿入
    if (event.ctrlKey && event.shiftKey && event.key === '2') {
      event.preventDefault();
      handleTemplateSelect(resumeTemplates.projectTemplate);
    }
    
    // Ctrl+Shift+3: スキルシートテンプレートを挿入
    if (event.ctrlKey && event.shiftKey && event.key === '3') {
      event.preventDefault();
      handleTemplateSelect(resumeTemplates.skillsTemplate);
    }
    
    // Ctrl+F: 全画面切り替え
    if (event.ctrlKey && event.key === 'f') {
      event.preventDefault();
      toggleFullscreen();
    }
    
    // Alt+E: 絵文字ピッカーを開く
    // (絵文字ピッカーを開くためのトリガー状態が必要)
    if (event.altKey && event.key === 'e') {
      event.preventDefault();
      // ここで絵文字ピッカーを開くためのトリガー
    }
  }, [editor, editMode, toggleFullscreen, handleTemplateSelect]);
  
  // キーボードショートカットの登録
  useEffect(() => {
    // キーボードショートカット登録
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // クリーンアップ
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [handleKeyboardShortcuts]);
  
  // エディター読み込み中表示
  if (!editor) {
    return <div className="flex items-center justify-center p-4 border rounded min-h-[300px]">
      <div className="text-gray-500">エディタを読み込み中...</div>
    </div>;
  }
  
  return (
    <div 
      className={cn(
        "relative",
        isFullscreen && "fixed inset-0 z-50 bg-background p-6"
      )}
      ref={editorContainerRef}
    >
      <div className={cn(
        "border rounded-lg p-4 space-y-4",
        isFullscreen && "h-full flex flex-col"
      )}>
        <div className="flex flex-col space-y-2">
          {/* フォーマットツールバー */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Force reset the processing flag if it's stuck
                  if (isProcessingModeChangeRef.current) {
                    isProcessingModeChangeRef.current = false;
                  }
                  toggleEditMode();
                }}
                className="text-xs"
                disabled={readOnly}
                aria-label={editMode === 'rich' ? 'マークダウンモードに切り替え' : 'リッチテキストモードに切り替え'}
              >
                {editMode === 'rich' ? 'マークダウン編集' : 'リッチテキスト編集'}
              </Button>
              
              {/* 書式設定ボタン */}
              {editor && editMode === 'rich' && !readOnly && (
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn("text-xs", editor.isActive('bold') && "bg-accent")}
                    aria-label="太字"
                  >
                    太字
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn("text-xs", editor.isActive('italic') && "bg-accent")}
                    aria-label="斜体"
                  >
                    斜体
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn("text-xs", editor.isActive('bulletList') && "bg-accent")}
                    aria-label="箇条書き"
                  >
                    箇条書き
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={cn("text-xs", editor.isActive('orderedList') && "bg-accent")}
                    aria-label="番号付きリスト"
                  >
                    番号付きリスト
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="text-xs"
                aria-label={isFullscreen ? '全画面表示解除' : '全画面表示'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          {/* 追加機能ツールバー */}
          <div className="flex justify-between items-center border-b pb-2">
            <div className="flex gap-2 items-center">
              {!readOnly && (
                <>
                  {/* テンプレートメニュー - 履歴書テンプレート */}
                  <div className="flex items-center">
                    <ResumeTemplatesMenu onSelectTemplate={handleTemplateSelect} />
                    <div className="mx-1 w-px h-4 bg-gray-200" aria-hidden="true"></div>
                  </div>
                  
                  {/* テーブル挿入メニュー */}
                  <div className="flex items-center">
                    <InsertTableMenu onInsertTable={handleTableInsert} />
                    <div className="mx-1 w-px h-4 bg-gray-200" aria-hidden="true"></div>
                  </div>
                  
                  {/* 既存のテンプレートプレビュー */}
                  <div className="flex items-center">
                    <TemplatePreview onSelectTemplate={handleTemplateSelect} />
                    <div className="mx-1 w-px h-4 bg-gray-200" aria-hidden="true"></div>
                  </div>
                  
                  {/* 既存のテーブルウィザード */}
                  <div className="flex items-center">
                    <EnhancedTableWizard onInsertTable={handleTableInsert} />
                    <div className="mx-1 w-px h-4 bg-gray-200" aria-hidden="true"></div>
                  </div>
                  
                  {/* テーブル用ツールバー（テーブル選択時のみ表示） */}
                  {editor && editMode === 'rich' && editor.isActive('table') && 
                    <TableEditingToolbar editor={editor} />
                  }
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!readOnly && (
                <>
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  <FileUpload onFileUpload={handleImageInsert} />
                </>
              )}
              <KeyboardShortcutsGuide />
              
              {/* 保存状態インジケーター */}
              <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded border text-xs">
                {saveStatus === 'saved' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true"></span>
                    <span className="text-green-700">保存済み</span>
                  </>
                )}
                {saveStatus === 'saving' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-yellow-500" aria-hidden="true"></span>
                    <span className="text-yellow-700">保存中...</span>
                  </>
                )}
                {saveStatus === 'unsaved' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true"></span>
                    <span className="text-red-700">未保存</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true"></span>
                    <span className="text-red-700">エラー</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* エディター本体 */}
        <div className={cn(
          "flex-grow", 
          isFullscreen && "overflow-auto"
        )}>
          {editMode === 'rich' ? (
            <EditorContent 
              editor={editor} 
              className={cn(
                "prose max-w-none", 
                readOnly && "pointer-events-none"
              )}
              aria-label="リッチテキストエディター"
            />
          ) : (
            <Textarea
              ref={textareaRef}
              value={markdownText}
              onChange={handleMarkdownChange}
              onSelect={handleMarkdownSelect}
              className={cn(
                "min-h-[300px] w-full font-mono text-sm",
                isFullscreen && "h-[calc(100vh-250px)]"
              )}
              placeholder={placeholder}
              readOnly={readOnly}
              aria-label="マークダウンエディター"
            />
          )}
        </div>
      </div>
    </div>
  );
};