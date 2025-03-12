import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export const useEditModeManager = (
  setIsEditing: (isEditing: boolean) => void
) => {
  const { toast } = useToast();
  const pendingSaveRef = useRef(false);

  const handleDirectEdit = () => {
    console.log("EditModeManager - handleDirectEdit called");
    
    // 編集モードを確実に有効にするため、少し遅延させる
    // 非同期処理やレンダリングサイクルの問題を回避するため
    setTimeout(() => {
      setIsEditing(true);
      console.log("EditModeManager - setIsEditing(true) executed");
      
      // 編集モードが確実に設定されたことを確認するため
      requestAnimationFrame(() => {
        console.log("EditModeManager - EditMode should be active now");
      });
    }, 0);
    
    pendingSaveRef.current = true;
    toast({
      title: "編集モード切り替えました",
      description: "職務経歴書を直接編集できます。",
    });
  };

  const handleFinishEditing = () => {
    console.log("EditModeManager - handleFinishEditing called");
    setIsEditing(false);
    console.log("EditModeManager - setIsEditing(false) executed");
  };

  return {
    handleDirectEdit,
    handleFinishEditing,
    pendingSaveRef
  };
};
