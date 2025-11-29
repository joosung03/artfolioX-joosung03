export interface Work {
    id: string;
    userId: string;
    title: string;
    description?: string | null;
    createdAt: number;
    imageUrl?: string | null;
    imagePath?: string | null; // Storage path used when deleting files
  }