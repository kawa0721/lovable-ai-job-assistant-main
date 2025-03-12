import { Button } from "@/components/ui/button";
import { PencilIcon, RefreshCw, Edit } from "lucide-react";
import { MarkdownEditor } from "@/components/resume/editor/MarkdownEditor";
import { FormData } from "@/types/form";
import { useEffect, useState } from "react";


interface ResumeEditorProps {
  formData: FormData;
  isEditing: boolean;
  onEdit: (description: string) => void;
  onDirectEdit: () => void;
  onFinishEditing: () => void;
  onRegenerate: () => void;
  onEditContent: () => void;
}

export const ResumeEditor = ({
  formData,
  isEditing,
  onEdit,
  onDirectEdit,
  onFinishEditing,
  onRegenerate,
  onEditContent,
}: ResumeEditorProps) => {
  // 編集中のコンテンツを保持するローカルステート
  const [editorContent, setEditorContent] = useState<string>("");
  // 編集可能フラグを内部でも管理（強制的に再レンダリングさせるため）
  const [internalIsEditing, setInternalIsEditing] = useState<boolean>(isEditing);
  
  // デバッグ用: formDataが変更された時のログ
  useEffect(() => {
    console.log("ResumeEditor - formData updated:", formData);
    console.log("ResumeEditor - description:", formData.description);
  }, [formData]);
  
  // デバッグ用: isEditingが変更された時のログ
  useEffect(() => {
    console.log("ResumeEditor - isEditing changed:", isEditing);
    // 外部のisEditingが変更されたら内部状態も同期する
    setInternalIsEditing(isEditing);
  }, [isEditing]);
  
  // formDataが変更されたとき、またはisEditingが変更されたときにeditorContentを更新
  useEffect(() => {
    const formattedContent = formatTemplateContent(formData);
    console.log("ResumeEditor - Updating editorContent:", {
      isEditing,
      internalIsEditing,
      currentContent: editorContent,
      newFormattedContent: formattedContent
    });
    setEditorContent(formattedContent);
  }, [formData, isEditing, internalIsEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (date: string) => {
    if (!date) return "";
    return date.replace("-", "年") + "月";
  };

  const parseTemplateContent = (content: string): string => {
    console.log("ResumeEditor - Parsing template content:", content);
    const descriptionMatch = content.match(/## 職務詳細\n\n([\s\S]*?)$/);
    const parsedContent = descriptionMatch ? descriptionMatch[1].trim() : content;
    console.log("ResumeEditor - Parsed content:", parsedContent);
    return parsedContent;
  };

  const formatTemplateContent = (data: FormData): string => {
    // 学歴履歴を整形
    const educationHistories = data.educationHistories ? data.educationHistories
      .map((edu, index) => 
        `### ${edu.schoolName || ""}
**卒業年月:** ${formatDate(edu.graduationDate)}  
**学部/学科:** ${edu.department || ""}  
${edu.faculty ? `**学部:** ${edu.faculty}  ` : ""}
${edu.major ? `**専攻:** ${edu.major}` : ""}`
      ).join("\n\n") : "";

    // テンプレートの生成（職務経歴書形式に整形）
    const templateContent = `# 職務経歴書

## 基本情報

| 項目 | 内容 |
|------|------|
| 氏名 | ${data.name || ""} |
| 希望職種 | ${data.position || ""} |
| 業界 | ${data.industry || ""} |
| 経験年数 | ${data.experience || ""}年 |

## 職務要約

${data.summary || ""}

## スキル

${data.skills || ""}

## 職務経歴

### 現職

**${data.currentJob.companyName || ""}**  
${data.currentJob.companyUrl ? `URL: ${data.currentJob.companyUrl}  \n` : ""}
**期間:** ${formatDate(data.currentJob.startDate)} ～ 現在  
**職種:** ${data.currentJob.position || ""}  
**役職:** ${data.currentJob.title || ""}  

#### 業務内容・実績
${data.currentJob.achievements || ""}

${data.previousJobs.map((job, index) => `### ${job.companyName || ""}

${job.companyUrl ? `URL: ${job.companyUrl}  \n` : ""}
**期間:** ${formatDate(job.startDate)} ～ ${formatDate(job.endDate)}  
**職種:** ${job.position || ""}  
**役職:** ${job.title || ""}  

#### 業務内容・実績
${job.achievements || ""}`).join("\n\n")}

## 学歴

### 最終学歴
**${data.education.university || ""}** ${data.education.faculty || ""} ${data.education.department || ""}  
${formatDate(data.education.graduationDate)}卒業

${educationHistories ? `### その他学歴\n\n${educationHistories}` : ""}

## 職務詳細

${data.description || "仕事内容を入力してください"}`;

    return templateContent;
  };

  // コンテンツが変更されたときの処理
  const handleEditorChange = (content: string) => {
    console.log("ResumeEditor - handleEditorChange called with content length:", content.length);
    setEditorContent(content);
    // 編集モードの場合のみ親コンポーネントに通知
    if (internalIsEditing) {
      const parsedContent = parseTemplateContent(content);
      console.log("ResumeEditor - Calling onEdit with parsed content:", parsedContent);
      onEdit(parsedContent);
    }
  };

  // 編集完了ボタンが押されたときの処理
  const handleFinishEdit = () => {
    console.log("ResumeEditor - handleFinishEdit called");
    // 最後にパースして親コンポーネントに通知してから編集モードを終了
    const parsedContent = parseTemplateContent(editorContent);
    console.log("ResumeEditor - Final content for save:", parsedContent);
    onEdit(parsedContent);
    // 編集モードを終了し、保存処理を実行
    console.log("ResumeEditor - Calling onFinishEditing");
    onFinishEditing();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg border-2 border-slate-700 shadow-md">
        <h3 className="font-medium mb-2 text-gray-900">職務経歴書</h3>
        <MarkdownEditor
          content={editorContent}
          onChange={handleEditorChange}
          readOnly={!internalIsEditing}
          key={`editor-${internalIsEditing}`} // 編集モードが変わったら強制的に再マウント
          initialMode="rich"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="flex-1" onClick={onEditContent}>
          <Edit className="w-4 h-4 mr-2" />
          入力内容を編集
        </Button>
        <Button 
          variant={internalIsEditing ? "default" : "outline"}
          className="flex-1" 
          onClick={internalIsEditing ? handleFinishEdit : onDirectEdit}
        >
          <PencilIcon className="w-4 h-4 mr-2" />
          {internalIsEditing ? "編集を完了" : "直接編集"}
        </Button>
        <Button variant="outline" className="flex-1" onClick={onRegenerate}>
          <RefreshCw className="w-4 h-4 mr-2" />
          再生成する
        </Button>
      </div>
    </div>
  );
};
