
export interface EbookData {
  id?: string;
  authorName: string;
  topic: string;
  pages: number;
  category: string;
  tone: string;
  description: string;
  authorBio: string;
  coverImage: string;
  authorImage: string;
  pageImages: string[];
  generatedContent: string;
  createdAt?: string;
}

export type EbookStep = 'form' | 'images' | 'preview' | 'export';
