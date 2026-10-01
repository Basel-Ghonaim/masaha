import type { RouteObject } from 'react-router';
import { ShowcasePage } from './ShowcasePage';
import { ShowcasePreview } from './ShowcasePreview';

/**
 * The showcase page group's route subtree. The app mounts it in development only. Each view has an
 * address: /__showcase (every section), /__showcase/<category>, /__showcase/<category>/<entry>; the
 * preview in the iframe repeats it under /__showcase/preview.
 */
export const showcaseRoutes: RouteObject[] = [
  {
    path: '/__showcase',
    children: [
      { path: 'preview/:category?/:entry?', Component: ShowcasePreview },
      { path: ':category?/:entry?', Component: ShowcasePage },
    ],
  },
];
