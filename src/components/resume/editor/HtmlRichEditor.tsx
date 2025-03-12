import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import { FormattingToolbar } from './FormattingToolbar';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// キーボードショートカットリストのコンポーネントを直接定義
const KeyboardShortcutsList: React.FC = () => {
  return (
    <div className="text-xs">
      <ul className="space-y-2">
        {[
          { keys: ['Ctrl', 'B'], description: '太字' },
          { keys: ['Ctrl', 'I'], description: '斜体' },
          { keys: ['Ctrl', 'U'], description: '下線' },
          { keys: ['Ctrl', '1-6'], description: '見出し (H1-H6)' },
          { keys: ['Ctrl', 'Shift', '7'], description: '順序なしリスト' },
          { keys: ['Ctrl', 'Shift', '8'], description: '順序付きリスト' },
          { keys: ['Ctrl', 'K'], description: 'リンク挿入' },
          { keys: ['Ctrl', 'Z'], description: '元に戻す' },
          { keys: ['Ctrl', 'Shift', 'Z'], description: 'やり直し' },
          { keys: ['Tab'], description: 'インデント増加' },
          { keys: ['Shift', 'Tab'], description: 'インデント減少' },
          { keys: ['Esc'], description: 'フルスクリーン終了' },
        ].map((item, index) => (
          <li key={index} className="flex justify-between">
            <div className="flex gap-1">
              {item.keys.map((key, keyIndex) => (
                <React.Fragment key={keyIndex}>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs font-semibold">
                    {key}
                  </kbd>
                  {keyIndex < item.keys.length - 1 && <span className="text-muted-foreground">+</span>}
                </React.Fragment>
              ))}
            </div>
            <span className="text-muted-foreground ml-2">{item.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export type HtmlEditorMode = 'html' | 'wysiwyg';

interface HtmlRichEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  showToolbar?: boolean;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isPreview?: boolean;
  onTogglePreview?: () => void;
  
  // 後方互換性のためのprops
  initialContent?: string;
  readOnly?: boolean;
}

// 拡張されたエディタタイプを定義
type ExtendedEditor = Editor & {
  customCommands: {
    setFontSize: (size: string) => void;
    unsetFontSize: () => void;
    setFontFamily: (family: string) => void;
    unsetFontFamily: () => void;
  }
};

/**
 * リッチテキストエディタコンポーネント
 * HTML編集とWYSIWYG編集の両方をサポート
 */
export function HtmlRichEditor({
  value,
  onChange,
  placeholder = 'ここに内容を入力...',
  autoFocus = false,
  disabled = false,
  showToolbar = true,
  fullscreen = false,
  onToggleFullscreen,
  isPreview = false,
  onTogglePreview,
  
  // 後方互換性のためのprops
  initialContent,
  readOnly
}: HtmlRichEditorProps) {
  // 後方互換性のため、valueとinitialContentを統合
  const actualValue = value || initialContent || '';
  const actualDisabled = disabled || readOnly || false;
  const actualOnChange = onChange || (() => {});

  const [isMounted, setIsMounted] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [editorHeight, setEditorHeight] = useState<number | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const startYRef = useRef<number | null>(null);
  const startHeightRef = useRef<number | null>(null);
  const { toast } = useToast();
  // カスタムコマンドを含むエディタ参照
  const extendedEditorRef = useRef<ExtendedEditor | null>(null);

  // エディタインスタンスの作成
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Image,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      // TextStyleを使用してフォントの色やサイズをサポート
      TextStyle.configure(),
      Color,
      Placeholder.configure({
        placeholder,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[200px] prose-gray dark:prose-invert prose-headings:font-bold prose-p:my-3',
        spellcheck: 'false',
      },
    },
    content: actualValue || '<p>コンテンツが読み込まれていません</p>',
    onUpdate: ({ editor }) => {
      // コンテンツの変更をHTMLとして親コンポーネントに渡す
      const html = editor.getHTML();
      console.log("HtmlRichEditor - Content updated:", html.length);
      actualOnChange(html);
    },
    autofocus: autoFocus && !actualDisabled,
    editable: !actualDisabled && !isPreview,
  }, []);  // 依存配列を空にして初期化時のみエディタを生成

  // コンポーネントがマウントされたときに初期コンテンツを設定
  useEffect(() => {
    if (editor && actualValue && editor.isEmpty) {
      console.log("HtmlRichEditor - Setting initial content on mount");
      try {
        editor.commands.setContent(actualValue);
      } catch (error) {
        console.error("HtmlRichEditor - Error setting initial content:", error);
      }
    }
  }, [editor, actualValue]);

  // カスタムコマンドを提供するための拡張エディタを設定
  useEffect(() => {
    if (editor) {
      // エディタにカスタムコマンドを追加
      const extended = editor as ExtendedEditor;
      extended.customCommands = {
        setFontSize: (size: string) => {
          editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
        },
        unsetFontSize: () => {
          editor.chain().focus().setMark('textStyle', { fontSize: null }).run();
        },
        setFontFamily: (family: string) => {
          editor.chain().focus().setMark('textStyle', { fontFamily: family }).run();
        },
        unsetFontFamily: () => {
          editor.chain().focus().setMark('textStyle', { fontFamily: null }).run();
        }
      };
      
      extendedEditorRef.current = extended;
    }
  }, [editor]);

  // エディタの内容が変更されたら更新
  useEffect(() => {
    if (!editor || !actualValue) {
      return;
    }

    console.log("HtmlRichEditor - Content update check:", {
      editorContent: editor.getHTML(),
      incomingContent: actualValue.substring(0, 50) + "...", // 長いコンテンツの場合は一部のみ表示
      contentLength: actualValue.length,
      hasEditor: !!editor,
      isContentDifferent: editor.getHTML() !== actualValue
    });
    
    // コンテンツが異なる場合のみ更新
    if (actualValue !== editor.getHTML()) {
      try {
        console.log("HtmlRichEditor - Updating content");
        setIsLoading(true);
        
        // 強制的に非同期でコンテンツを更新（レンダリングの問題を避けるため）
        setTimeout(() => {
          if (editor) {
            editor.commands.setContent(actualValue);
            console.log("HtmlRichEditor - Content updated successfully");
          }
          setIsLoading(false);
        }, 0);
      } catch (error) {
        console.error('エディタの内容更新中にエラーが発生しました:', error);
        toast({
          title: 'エラー',
          description: 'エディタの内容を更新できませんでした',
          variant: 'destructive'
        });
        setIsLoading(false);
      }
    }
  }, [editor, actualValue, toast]);

  // マウントされたらisMountedをtrueに
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // リサイズハンドルのキーボードイベント処理
  const handleResizeKeyDown = useCallback((e: React.KeyboardEvent) => {
    // スペースまたはエンターでリサイズ開始
    if ((e.key === ' ' || e.key === 'Enter') && !isResizing) {
      e.preventDefault();
      setIsResizing(true);
    }
    
    // エスケープでリサイズキャンセル
    if (e.key === 'Escape' && isResizing) {
      e.preventDefault();
      setIsResizing(false);
    }
    
    // 上下矢印でサイズ調整
    if (isResizing && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const currentHeight = editorHeight || 
        (editorContainerRef.current?.querySelector('.ProseMirror')?.clientHeight || 200);
      
      const newHeight = e.key === 'ArrowUp'
        ? Math.max(currentHeight - 20, 100) // 最小高さは100px
        : currentHeight + 20;
        
      setEditorHeight(newHeight);
    }
  }, [isResizing, editorHeight]);

  // マウス操作によるリサイズ処理
  const startResize = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
    
    // マウスイベントとタッチイベントの両方に対応
    const clientY = 'touches' in e 
      ? e.touches[0].clientY 
      : e.clientY;
    
    startYRef.current = clientY;
    
    const editorElement = editorContainerRef.current?.querySelector('.ProseMirror');
    if (editorElement) {
      startHeightRef.current = editorElement.clientHeight;
    }
  }, []);
  
  const handleResize = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing) return;
    
    // マウスイベントとタッチイベントの両方に対応
    const clientY = 'touches' in e 
      ? e.touches[0].clientY 
      : e.clientY;
    
    if (startYRef.current !== null && startHeightRef.current !== null) {
      const deltaY = clientY - startYRef.current;
      const newHeight = Math.max(100, startHeightRef.current + deltaY);
      setEditorHeight(newHeight);
    }
  }, [isResizing]);
  
  const stopResize = useCallback(() => {
    setIsResizing(false);
    startYRef.current = null;
    startHeightRef.current = null;
  }, []);

  // グローバルのマウス/タッチイベントリスナー
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('touchmove', handleResize);
      document.addEventListener('mouseup', stopResize);
      document.addEventListener('touchend', stopResize);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('touchmove', handleResize);
      document.removeEventListener('mouseup', stopResize);
      document.removeEventListener('touchend', stopResize);
    };
  }, [isResizing, handleResize, stopResize]);

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center p-4 border rounded-md bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      ref={editorContainerRef}
      className={`border rounded-md overflow-hidden relative ${fullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ツールバー */}
      {showToolbar && (
        <FormattingToolbar 
          editor={editor} 
          isPreview={isPreview}
          isFullscreen={fullscreen}
          onToggleFullscreen={onToggleFullscreen}
          onTogglePreview={onTogglePreview}
          onToggleShortcuts={() => setShowShortcuts(true)}
        />
      )}

      {/* エディタ本体 */}
      <div 
        className={`relative flex-1 overflow-auto ${isPreview ? 'prose max-w-none p-4 prose-gray dark:prose-invert' : ''}`}
        style={{
          maxHeight: fullscreen ? 'calc(100vh - 50px)' : undefined,
          height: editorHeight ? `${editorHeight}px` : undefined,
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        
        <EditorContent editor={editor} />
        
        {isPreview && !editor?.isEmpty && (
          <div dangerouslySetInnerHTML={{ __html: actualValue }} />
        )}
        
        {editor && editor.isEmpty && isPreview && (
          <div className="text-muted-foreground italic p-4">
            プレビューする内容がありません
          </div>
        )}
      </div>

      {/* リサイズハンドル */}
      {!fullscreen && !isPreview && (
        <div 
          className={`h-6 cursor-ns-resize flex items-center justify-center border-t ${isResizing ? 'bg-accent' : 'hover:bg-muted'}`}
          onMouseDown={startResize}
          onTouchStart={startResize}
          tabIndex={0}
          role="slider"
          aria-valuemin={100}
          aria-valuemax={800}
          aria-valuenow={editorHeight || 200}
          aria-valuetext={`エディタの高さ: ${editorHeight || 200}ピクセル`}
          onKeyDown={handleResizeKeyDown}
        >
          <span className="sr-only">上下の矢印キーでエディタの高さを調整できます</span>
          <div className="w-8 h-1 rounded-full bg-muted-foreground/40"></div>
        </div>
      )}

      {/* キーボードショートカットパネル */}
      <Sheet open={showShortcuts} onOpenChange={setShowShortcuts}>
        <SheetContent side="right" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>キーボードショートカット</SheetTitle>
            <SheetDescription>
              エディタを効率的に使うためのショートカットキー一覧
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <KeyboardShortcutsList />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
} 