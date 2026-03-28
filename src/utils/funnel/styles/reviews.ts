
export const getReviewStyles = (): string => {
  return `
        .reviews {
            background: #f8f9fa;
            padding: 40px 20px;
            animation: fadeIn 1s ease-out;
        }
        .review-card {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            animation: slideInLeft 0.6s ease-out;
            transition: transform 0.3s ease;
        }
        .review-card:hover {
            transform: scale(1.02);
        }
        .reviewer-info {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .reviewer-photo {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            margin-right: 15px;
            object-fit: cover;
        }
        .stars {
            color: #f39c12;
            font-size: 1.2rem;
        }
  `;
};
