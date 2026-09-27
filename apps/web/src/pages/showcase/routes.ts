import type { RouteObject } from 'react-router';
import { ShowcasePage } from './ShowcasePage';
import { ShowcasePreview } from './ShowcasePreview';

/** The showcase page group's route subtree. The app mounts it in development only. */
export const showcaseRoutes: RouteObject[] = [
  {
    path: '/__showcase',
    children: [
      { index: true, Component: ShowcasePage },
      { path: 'preview', Component: ShowcasePreview },
    ],
  },
];
