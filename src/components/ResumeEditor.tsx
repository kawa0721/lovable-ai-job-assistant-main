import { Button } from "@/components/ui/button";
import { PencilIcon, RefreshCw, Edit } from "lucide-react";
import { HtmlRichEditor } from "@/components/resume/editor/HtmlRichEditor";
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
  const [editorContent, setEditorContent] = useState<string>("");
  const [internalIsEditing, setInternalIsEditing] = useState<boolean>(isEditing);

  useEffect(() => {
    console.log("ResumeEditor - formData updated:", formData);
    console.log("ResumeEditor - description:", formData.description);
  }, [formData]);

  useEffect(() => {
    console.log("ResumeEditor - isEditing changed:", isEditing);
    setInternalIsEditing(isEditing);
  }, [isEditing]);

  useEffect(() => {
    console.log("ResumeEditor - formData or editing state changed");
    if (formData) {
      const formattedContent = formatTemplateContent(formData);
      console.log("ResumeEditor - Updating editorContent:", {
        isEditing,
        currentContent: editorContent,
        newContent: formattedContent ? formattedContent.substring(0, 50) + "..." : "empty",
        formattedContentLength: formattedContent.length,
      });

      if (formattedContent && formattedContent.trim() !== "") {
        console.log("ResumeEditor - Setting new editor content");
        setEditorContent(formattedContent);
      }
    }
  }, [formData, isEditing]);

  useEffect(() => {
    console.log("ResumeEditor - Component mounted, initializing content");
    if (formData) {
      const initialContent = formatTemplateContent(formData);
      console.log("ResumeEditor - Initial content length:", initialContent.length);
      setEditorContent(initialContent);
    }
  }, []);

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
    const educationHistories = data.educationHistories
      ? data.educationHistories
          .map((edu, index) => 
            `### ${edu.schoolName || ""}
**卒業年月:** ${formatDate(edu.graduationDate)}  
**学部/学科:** ${edu.department || ""}  
${edu.faculty ? `**学部:** ${edu.faculty}  ` : ""}
${edu.major ? `**専攻:** ${edu.major}` : ""}`
          ).join("\n\n")
      : "";

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

  const handleEditorChange = (content: string) => {
    if (!content) {
      console.log("ResumeEditor - Empty content received in handleEditorChange");
      return;
    }

    console.log("ResumeEditor - handleEditorChange called with content length:", content.length);

    if (content === editorContent) {
      console.log("ResumeEditor - Content unchanged, skipping update");
      return;
    }

    setEditorContent(content);

    if (internalIsEditing) {
      try {
        const parsedContent = parseTemplateContent(content);
        console.log("ResumeEditor - Calling onEdit with parsed content length:", parsedContent.length);
        onEdit(parsedContent);
      } catch (error) {
        console.error("ResumeEditor - Error parsing template content:", error);
      }
    }
  };

  const handleFinishEdit = () => {
    console.log("ResumeEditor - handleFinishEdit called");
    const parsedContent = parseTemplateContent(editorContent);
    console.log("ResumeEditor - Final content for save:", parsedContent);
    onEdit(parsedContent);
    console.log("ResumeEditor - Calling onFinishEditing");
    onFinishEditing();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
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
      <div className="bg-white p-4 rounded-lg border-2 border-slate-700 shadow-md">
        <h3 className="font-medium mb-2 text-gray-900">職務経歴書</h3>
        {editorContent ? (
          <HtmlRichEditor
            initialContent={editorContent}
            value={editorContent}
            onChange={handleEditorChange}
            readOnly={!internalIsEditing}
            disabled={!internalIsEditing}
            placeholder="ここに職務経歴書の内容が表示されます..."
            key={`editor-${internalIsEditing}-${formData?.id || "new"}`}
          />
        ) : (
          <div className="text-gray-500 p-4 text-center">
            コンテンツを読み込み中...
          </div>
        )}
      </div>
    </div>
  );
};
