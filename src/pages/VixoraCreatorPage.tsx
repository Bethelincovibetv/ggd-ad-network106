import React from 'react';
import { useNavigate } from 'react-router-dom';
import MetaTags from '@/components/MetaTags';
import VixoraCreatorApp from '@/vixora/VixoraCreatorApp';

const VixoraCreatorPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <MetaTags
        title="Vixora AI Creator Studio — Automated Viral Videos, Voiceovers & Script Engine"
        description="Create high-retention viral shorts, AI voiceovers, multi-scene video sequences, and scripts with Vixora AI Creator Studio on GGD Ad Network."
        badge="AI CREATOR SUITE"
        keywords={['Vixora AI', 'AI video generator', 'viral video sequencer', 'AI voiceover', 'Gemini Kore TTS', 'automated video production', 'GGD Ad Network']}
      />
      <VixoraCreatorApp
        embedded={false}
        onBackToDashboard={() => navigate('/')}
      />
    </>
  );
};

export default VixoraCreatorPage;
