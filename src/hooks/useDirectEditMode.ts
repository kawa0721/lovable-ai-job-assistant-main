import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { FormData, WorkExperience } from "@/types/form";

export const useDirectEditMode = (
  mode: 'edit' | 'view',
  setStep: (step: number) => void,
  setIsEditing: (isEditing: boolean) => void,
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void
) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  
  // Check if we're in direct edit mode
  const isDirectEditMode = mode === 'edit';

  // Set up edit mode when component mounts
  useEffect(() => {
    if (isDirectEditMode && id) {
      console.log("DirectEditMode - Direct Edit Mode activated for resume ID:", id);
      setStep(2); // Go directly to step 2 (edit screen)
      
      // 編集モードを確実に有効にする - 100msの遅延で確実にレンダリングサイクル後に実行
      setTimeout(() => {
        console.log("DirectEditMode - Setting isEditing to true with delay");
        setIsEditing(true); // Enable editing mode
        
        // 確実に編集モードが有効になったことを確認（デバッグ用）
        setTimeout(() => {
          console.log("DirectEditMode - Editing mode should be active now");
        }, 50);
      }, 100);
    }
  }, [isDirectEditMode, id, setStep, setIsEditing]);

  const fetchResumeData = async (user: User | null) => {
    // Skip if we've already tried to fetch or are currently loading
    if (hasAttemptedFetch || isLoading) return;
    
    if (!isDirectEditMode || !id) return;
    
    // 非ログインでの編集閲覧の場合、認証エラーを表示するだけにして、リダイレクトはしない
    // ログイン済みのユーザーはそのまま処理を続行
    if (!user && mode === 'edit') {
      console.log("DirectEditMode - No user found, showing auth needed message");
      toast({
        title: "ログインが必要です",
        description: "保存するにはログインしてください。プレビューのみ可能です。",
      });
      // ログイン必須だが、リダイレクトはせずに編集モードは継続
      return;
    }
    
    try {
      setIsLoading(true);
      console.log("DirectEditMode - Fetching resume data for direct editing, user ID:", user?.id || "no user");
      
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("id", id)
        .single();
        
      setHasAttemptedFetch(true);
      
      if (error) {
        console.error("Error fetching resume:", error);
        toast({
          title: "エラー",
          description: "職務経歴書の読み込みに失敗しました",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
      
      if (!data) {
        console.error("No resume data found");
        toast({
          title: "エラー",
          description: "職務経歴書が見つかりませんでした",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
      
      // Transform database data to FormData format
      const resumeData: FormData = {
        id: data.id,
        name: data.name || "",
        industry: data.industry || "",
        position: data.position || "",
        experience: data.experience || "",
        skills: data.skills || "",
        summary: data.summary || "",
        description: data.description || "",
        education: {
          university: data.current_job && typeof data.current_job === 'object' && 'education' in data.current_job && 
                      data.current_job.education && typeof data.current_job.education === 'object' ? 
                      (data.current_job.education as any).university || "" : "",
          faculty: data.current_job && typeof data.current_job === 'object' && 'education' in data.current_job && 
                   data.current_job.education && typeof data.current_job.education === 'object' ? 
                   (data.current_job.education as any).faculty || "" : "",
          department: data.current_job && typeof data.current_job === 'object' && 'education' in data.current_job && 
                      data.current_job.education && typeof data.current_job.education === 'object' ? 
                      (data.current_job.education as any).department || "" : "",
          graduationDate: data.current_job && typeof data.current_job === 'object' && 'education' in data.current_job && 
                          data.current_job.education && typeof data.current_job.education === 'object' ? 
                          (data.current_job.education as any).graduationDate || "" : "",
        },
        currentJob: {
          companyName: data.current_job && typeof data.current_job === 'object' ? (data.current_job as any).companyName || "" : "",
          companyUrl: data.current_job && typeof data.current_job === 'object' ? (data.current_job as any).companyUrl || "" : "",
          startDate: data.current_job && typeof data.current_job === 'object' ? (data.current_job as any).startDate || "" : "",
          position: data.current_job && typeof data.current_job === 'object' ? (data.current_job as any).position || "" : "",
          title: data.current_job && typeof data.current_job === 'object' ? (data.current_job as any).title || "" : "",
          achievements: data.current_job && typeof data.current_job === 'object' ? (data.current_job as any).achievements || "" : "",
        },
        previousJobs: Array.isArray(data.previous_jobs) ? 
          data.previous_jobs.map((job: any) => ({
            companyName: job?.companyName || "",
            companyUrl: job?.companyUrl || "",
            startDate: job?.startDate || "",
            endDate: job?.endDate || "",
            position: job?.position || "",
            title: job?.title || "",
            achievements: job?.achievements || "",
            isSameAsCurrentCompany: job?.isSameAsCurrentCompany || false
          } as WorkExperience)) : [],
        educationHistories: [],
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id,
      };
      
      setFormData(resumeData);
      console.log("DirectEditMode - Resume data loaded for direct editing:", {
        id: resumeData.id,
        name: resumeData.name
      });
      
      // データ取得後も編集モードを確認/再設定する
      if (isDirectEditMode) {
        console.log("DirectEditMode - Re-confirming edit mode after data fetch");
        setTimeout(() => {
          setIsEditing(true);
        }, 0);
      }
      
      toast({
        title: "読み込み完了",
        description: "職務経歴書の読み込みが完了しました",
      });
    } catch (error) {
      console.error("Error in fetchResumeData:", error);
      toast({
        title: "エラー",
        description: "職務経歴書の読み込み中にエラーが発生しました",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isDirectEditMode,
    fetchResumeData,
    isLoading
  };
};
