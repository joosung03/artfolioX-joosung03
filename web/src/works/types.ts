export interface Work {
    id: string;
    userEmail: string;
    title: string;
    description?: string | null;
    createdAt: number;
    imageData?: string | null;
  
    // 새로 추가
    project?: string | null; // 예: 입시, 개인작업, 학교과제
    year?: string | null;    // 예: 2024
    tags?: string[];         // 예: ["인물", "유화"]
  }
  