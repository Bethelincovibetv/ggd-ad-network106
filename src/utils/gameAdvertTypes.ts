
export interface GameAdvertType {
  id: string;
  name: string;
  description: string;
  style: {
    background: string;
    borderColor: string;
    textColor: string;
    accentColor: string;
    buttonStyle: string;
    animations: string[];
  };
}

export const gameAdvertTypes: GameAdvertType[] = [
  {
    id: 'loud-game',
    name: 'Loud Game',
    description: 'High-energy, flashy gaming advert with intense colors and animations',
    style: {
      background: 'linear-gradient(135deg, #ff0000, #ff6600, #ffcc00)',
      borderColor: '#ff0000',
      textColor: '#ffffff',
      accentColor: '#ffff00',
      buttonStyle: 'linear-gradient(45deg, #ff0000, #ff8800)',
      animations: ['pulse', 'shake', 'glow', 'bounce']
    }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Futuristic neon-style gaming advert',
    style: {
      background: 'linear-gradient(135deg, #0a0a0a, #1a0d2e, #2d1b69)',
      borderColor: '#00ffff',
      textColor: '#00ffff',
      accentColor: '#ff00ff',
      buttonStyle: 'linear-gradient(45deg, #00ffff, #ff00ff)',
      animations: ['glow', 'flicker', 'slide']
    }
  },
  {
    id: 'retro-arcade',
    name: 'Retro Arcade',
    description: 'Classic 80s arcade-style gaming advert',
    style: {
      background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
      borderColor: '#00ff00',
      textColor: '#00ff00',
      accentColor: '#ffff00',
      buttonStyle: 'linear-gradient(45deg, #ff6b6b, #ff8e53)',
      animations: ['pulse', 'bounce']
    }
  },
  {
    id: 'fantasy-rpg',
    name: 'Fantasy RPG',
    description: 'Medieval fantasy-themed gaming advert',
    style: {
      background: 'linear-gradient(135deg, #2c1810, #4a2c2a, #8b4513)',
      borderColor: '#ffd700',
      textColor: '#ffd700',
      accentColor: '#ff6347',
      buttonStyle: 'linear-gradient(45deg, #ffd700, #ff6347)',
      animations: ['glow', 'pulse']
    }
  },
  {
    id: 'space-shooter',
    name: 'Space Shooter',
    description: 'Sci-fi space-themed gaming advert',
    style: {
      background: 'linear-gradient(135deg, #000011, #000033, #001155)',
      borderColor: '#0066ff',
      textColor: '#ffffff',
      accentColor: '#00aaff',
      buttonStyle: 'linear-gradient(45deg, #0066ff, #00aaff)',
      animations: ['pulse', 'glow', 'float']
    }
  },
  {
    id: 'battle-royale',
    name: 'Battle Royale',
    description: 'Intense battle-themed gaming advert',
    style: {
      background: 'linear-gradient(135deg, #2d1b00, #5d3300, #8b4500)',
      borderColor: '#ff4500',
      textColor: '#ffffff',
      accentColor: '#ff6500',
      buttonStyle: 'linear-gradient(45deg, #ff4500, #ff6500)',
      animations: ['shake', 'pulse', 'glow']
    }
  },
  {
    id: 'puzzle-casual',
    name: 'Puzzle Casual',
    description: 'Friendly, colorful casual gaming advert',
    style: {
      background: 'linear-gradient(135deg, #ff9a9e, #fecfef, #fecfef)',
      borderColor: '#ff69b4',
      textColor: '#333333',
      accentColor: '#ff1493',
      buttonStyle: 'linear-gradient(45deg, #ff69b4, #ff1493)',
      animations: ['bounce', 'pulse']
    }
  },
  {
    id: 'racing',
    name: 'Racing',
    description: 'High-speed racing-themed gaming advert',
    style: {
      background: 'linear-gradient(135deg, #ff4500, #ff6347, #ffa500)',
      borderColor: '#ff0000',
      textColor: '#ffffff',
      accentColor: '#ffff00',
      buttonStyle: 'linear-gradient(45deg, #ff0000, #ff4500)',
      animations: ['speed', 'glow', 'pulse']
    }
  },
  {
    id: 'horror',
    name: 'Horror',
    description: 'Dark, spooky horror-themed gaming advert',
    style: {
      background: 'linear-gradient(135deg, #1a0000, #330000, #4d0000)',
      borderColor: '#800000',
      textColor: '#ff6666',
      accentColor: '#ff0000',
      buttonStyle: 'linear-gradient(45deg, #800000, #ff0000)',
      animations: ['flicker', 'pulse', 'shake']
    }
  },
  {
    id: 'sports',
    name: 'Sports',
    description: 'Athletic sports-themed gaming advert',
    style: {
      background: 'linear-gradient(135deg, #006400, #228b22, #32cd32)',
      borderColor: '#00ff00',
      textColor: '#ffffff',
      accentColor: '#ffff00',
      buttonStyle: 'linear-gradient(45deg, #228b22, #32cd32)',
      animations: ['bounce', 'pulse']
    }
  }
];

export const searchGameAdvertTypes = (query: string): GameAdvertType[] => {
  if (!query.trim()) return gameAdvertTypes;
  
  const lowercaseQuery = query.toLowerCase();
  return gameAdvertTypes.filter(type => 
    type.name.toLowerCase().includes(lowercaseQuery) ||
    type.description.toLowerCase().includes(lowercaseQuery)
  );
};

export const generateAdvertStyle = (advertType: GameAdvertType): string => {
  const { style } = advertType;
  
  return `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    @keyframes glow {
        0% { box-shadow: 0 0 5px ${style.accentColor}; }
        50% { box-shadow: 0 0 20px ${style.accentColor}, 0 0 30px ${style.accentColor}; }
        100% { box-shadow: 0 0 5px ${style.accentColor}; }
    }
    @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
    }
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
        20%, 40%, 60%, 80% { transform: translateX(2px); }
    }
    @keyframes flicker {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
    }
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
    }
    
    .gaming-advert {
        max-width: 400px;
        background: ${style.background};
        border: 2px solid ${style.borderColor};
        border-radius: 15px;
        padding: 20px;
        text-align: center;
        color: ${style.textColor};
        font-family: 'Arial', sans-serif;
        position: relative;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;
        animation: ${style.animations.includes('glow') ? 'glow 2s infinite' : ''};
    }
    
    .gaming-advert:hover {
        transform: scale(1.02);
        box-shadow: 0 10px 30px rgba(0, 255, 0, 0.3);
    }
    
    .product-title {
        font-size: 24px;
        font-weight: bold;
        color: ${style.accentColor};
        text-shadow: 0 0 10px ${style.accentColor};
        margin: 15px 0;
        animation: ${style.animations.includes('glow') ? 'glow 2s infinite' : ''};
    }
    
    .play-button {
        background: ${style.buttonStyle};
        border: none;
        padding: 15px 30px;
        border-radius: 25px;
        color: white;
        font-weight: bold;
        font-size: 16px;
        cursor: pointer;
        animation: ${style.animations.includes('bounce') ? 'bounce 2s infinite' : style.animations.includes('pulse') ? 'pulse 2s infinite' : ''};
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-top: 15px;
    }
    
    .corner-effects {
        position: absolute;
        width: 20px;
        height: 20px;
        border: 2px solid ${style.borderColor};
    }
  `;
};
