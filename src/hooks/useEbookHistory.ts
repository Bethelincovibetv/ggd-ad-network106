
import { useState, useEffect } from 'react';
import { EbookData } from '@/types/ebook';

export const useEbookHistory = () => {
  const [ebookHistory, setEbookHistory] = useState<EbookData[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('ebookHistory');
    if (savedHistory) {
      setEbookHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveEbook = (ebook: EbookData) => {
    const newEbook = {
      ...ebook,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    const updatedHistory = [newEbook, ...ebookHistory];
    setEbookHistory(updatedHistory);
    localStorage.setItem('ebookHistory', JSON.stringify(updatedHistory));
    
    return newEbook;
  };

  const deleteEbook = (id: string) => {
    const updatedHistory = ebookHistory.filter(ebook => ebook.id !== id);
    setEbookHistory(updatedHistory);
    localStorage.setItem('ebookHistory', JSON.stringify(updatedHistory));
  };

  const remixEbook = (ebook: EbookData) => {
    return {
      ...ebook,
      id: undefined,
      createdAt: undefined,
      generatedContent: ''
    };
  };

  return {
    ebookHistory,
    saveEbook,
    deleteEbook,
    remixEbook
  };
};
