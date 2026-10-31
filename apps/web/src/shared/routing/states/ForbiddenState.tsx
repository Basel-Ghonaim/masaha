import { useCopy } from '@shared/copy';
import { Button, EmptyState, LockIcon } from '@shared/design-system';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { StatusPage } from './StatusPage';

// The site's home and About's contact section: where the bare 403 leads, outside any shell.
const HOME_PATH = '/';
const CONTACT_PATH = '/about#contact';

/**
 * A signed-in user on a page their account may not open: a clear 403, never a silent redirect
 * (docs/frontend/architecture.md §2). Each domain may give its own way on, as `children`. Outside
 * any shell (`bare`, the admin's area to another role), it says «إن كنت تظن أن هذا خطأ، تواصل معنا.»
 * with «الرئيسية» and «تواصل معنا» (DI21); inside one, its navigation is the way on.
 */
export function ForbiddenState({
  bare = false,
  children,
}: {
  bare?: boolean;
  children?: ReactNode;
}) {
  const copy = useCopy();

  return (
    <StatusPage>
      <EmptyState
        icon={<LockIcon />}
        title={copy.status.forbidden.title}
        titleAs="h1"
        description={copy.status.forbidden.description}
      >
        {bare && (
          <>
            <p className="text-body-sm text-muted-foreground">{copy.status.forbidden.mistake}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to={HOME_PATH}>{copy.site.links.home}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={CONTACT_PATH}>{copy.site.contact}</Link>
              </Button>
            </div>
          </>
        )}
        {children}
      </EmptyState>
    </StatusPage>
  );
}
