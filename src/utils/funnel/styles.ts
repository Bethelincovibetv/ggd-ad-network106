
import { getAnimationStyles } from "./styles/animations";
import { getLayoutStyles } from "./styles/layout";
import { getComponentStyles } from "./styles/components";
import { getFeatureStyles } from "./styles/features";
import { getReviewStyles } from "./styles/reviews";

export const getFunnelStyles = (): string => {
  return `
        ${getLayoutStyles()}
        ${getComponentStyles()}
        ${getFeatureStyles()}
        ${getReviewStyles()}
        ${getAnimationStyles()}
  `;
};
