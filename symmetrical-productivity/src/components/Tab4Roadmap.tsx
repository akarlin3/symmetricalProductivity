import React from 'react';
import {
  RoadmapHorizonView,
  RoadmapHorizonViewProps,
} from './RoadmapHorizonView';

export type Tab4RoadmapProps = RoadmapHorizonViewProps;

export const Tab4Roadmap: React.FC<Tab4RoadmapProps> = (props) => {
  return <RoadmapHorizonView {...props} />;
};
