
export const getComponentStyles = (): string => {
  return `
        .header {
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            color: white;
            text-align: center;
            padding: 20px;
            animation: slideInDown 1s ease-out;
        }
        .countdown {
            background: #ff4757;
            color: white;
            text-align: center;
            padding: 15px;
            font-size: 18px;
            font-weight: bold;
            animation: fadeInUp 1.2s ease-out;
        }
        .countdown-timer {
            font-size: 24px;
            margin-top: 10px;
            animation: pulse 2s infinite;
        }
        .hero {
            padding: 40px 20px;
            text-align: center;
            animation: fadeIn 1.5s ease-out;
        }
        .hero h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            color: #2c3e50;
            animation: zoomIn 1s ease-out 0.5s both;
        }
        .hero-description {
            font-size: 1.2rem;
            margin-bottom: 30px;
            color: #7f8c8d;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            padding: 25px;
            border-radius: 15px;
            border: 2px solid #dee2e6;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            position: relative;
            overflow: hidden;
            animation: slideInUp 1s ease-out 0.8s both;
        }
        .hero-description::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            animation: shimmer 3s infinite;
        }
        .hero-description::after {
            content: '✨';
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 24px;
            animation: twinkle 2s infinite;
        }
        .description-highlight {
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: bold;
            font-size: 1.3rem;
            line-height: 1.4;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .video-section {
            margin: 40px 20px;
            text-align: center;
            animation: fadeInUp 1s ease-out;
        }
        .video-wrapper {
            position: relative;
            padding-bottom: 56.25%;
            height: 0;
            margin-bottom: 20px;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 15px 35px rgba(0,0,0,0.2);
            animation: scaleIn 0.8s ease-out;
        }
        .video-wrapper iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
        .price-section {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            padding: 40px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
            animation: fadeIn 1s ease-out;
        }
        .price-section::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,107,107,0.1) 0%, transparent 70%);
            animation: rotate 20s linear infinite;
        }
        .price {
            font-size: 3rem;
            color: #e74c3c;
            font-weight: bold;
            margin: 20px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            animation: bounceIn 1s ease-out;
            position: relative;
            z-index: 2;
        }
        .cta-button {
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            color: white;
            padding: 20px 40px;
            font-size: 1.5rem;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
            margin: 20px 0;
            animation: pulse 2s infinite, glow 2s ease-in-out infinite alternate;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            position: relative;
            overflow: hidden;
        }
        .cta-button:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: none;
        }
        .cta-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.6s;
        }
        .cta-button:hover::before {
            left: 100%;
        }
        .bonus-section {
            background: linear-gradient(45deg, #2c3e50, #3498db);
            color: white;
            padding: 40px 20px;
            text-align: center;
            animation: fadeInUp 1s ease-out;
        }
        .guarantee {
            background: #27ae60;
            color: white;
            padding: 30px 20px;
            text-align: center;
            animation: fadeIn 1s ease-out;
        }
  `;
};
