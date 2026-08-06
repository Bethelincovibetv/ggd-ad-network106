import React from 'react';
import ggdLogo from '@/assets/ggd-logo.png';

const Logo = () => {
  return (
    <div className="flex items-center gap-2">
      <img src={ggdLogo} alt="GGD Ad Network" className="h-8 w-8 rounded-lg" />
      <span className="font-black text-lg bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">GGD Ad Network</span>
    </div>
  );
};

export default Logo;
