
export interface BlogSection {
  heading: string;
  content: string;
  imageUrl?: string | null;
  imageAlt?: string;
}

export interface BlogPost {
  title: string;
  metaDescription: string;
  sections: BlogSection[];
}
