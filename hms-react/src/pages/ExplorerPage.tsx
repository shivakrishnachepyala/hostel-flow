import React from 'react';
import { HostelExplorerView } from '../components/3d/HostelExplorerView';

/**
 * Public & Student 3D Accommodation Explorer Page
 * Reuses the authoritative HostelExplorerView component.
 */
export const ExplorerPage: React.FC = () => {
  return <HostelExplorerView isWardenView={false} />;
};
