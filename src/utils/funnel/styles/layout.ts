
export const getLayoutStyles = (): string => {
  return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
        }
        
        @media (max-width: 768px) {
            .hero h1 { font-size: 2rem; }
            .price { font-size: 2rem; }
            .cta-button { font-size: 1.2rem; padding: 15px 30px; }
            .hero-description { font-size: 1.1rem; padding: 20px; }
        }
  `;
};
