
export const getFeatureStyles = (): string => {
  return `
        .feature-bullets {
            text-align: left;
            margin-top: 20px;
            padding: 0;
        }
        .feature-bullets li {
            list-style: none;
            padding: 8px 0;
            position: relative;
            padding-left: 30px;
            font-size: 1.1rem;
            color: #495057;
            animation: slideInLeft 0.6s ease-out;
        }
        .feature-bullets li:before {
            content: '🚀';
            position: absolute;
            left: 0;
            top: 8px;
            font-size: 16px;
            animation: bounce 2s infinite;
        }
        .features {
            padding: 40px 20px;
            animation: fadeInUp 1s ease-out;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .feature-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s ease;
            animation: slideInUp 0.6s ease-out;
        }
        .feature-card:hover {
            transform: translateY(-5px);
        }
  `;
};
