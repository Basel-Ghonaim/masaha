import {
  Badge,
  Button,
  Card,
  CardContent,
  EyeIcon,
  CopyIcon,
  Meter,
  Skeleton,
} from '@shared/design-system';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { ProfileHeaderView } from '../../hooks/editor/useProfileHeader';

/**
 * The profile's header (H1–H4, M2): a summary of the space, never a section. The cover beside the
 * name — 64 px square on a phone, larger from 768 px — or the space's letter tile with «أضف صورة
 * غلاف»; the name, its area and its state; the page's actions (`actions`, the admin's link of an
 * owner); «عرض الصفحة العامة» in a new tab and «نسخ الرابط», the card's full width on a phone; and
 * «اكتمال الملف», the layer's meter and the line of what is still to do, each part a link to its
 * section, a skeleton while the gallery is read, and once its read has failed the line that says
 * it cannot count, with «إعادة المحاولة».
 */
export function ProfileHeader({
  view,
  areaLine,
  actions,
}: {
  view: ProfileHeaderView;
  areaLine: ReactNode;
  actions?: ReactNode;
}) {
  const { completeness } = view;
  return (
    <Card aria-labelledby="profile-name">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-3 md:gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted md:h-24 md:w-40">
              {view.cover === null ? (
                <span aria-hidden lang="en" className="text-heading-2 text-primary">
                  {view.letter}
                </span>
              ) : (
                <img src={view.cover.src} alt="" className="size-full object-cover" />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <h2
                id="profile-name"
                lang={view.name.lang}
                dir={view.name.dir}
                className="text-heading-2 break-words md:text-heading-1"
              >
                {view.name.text}
              </h2>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-muted-foreground">
                {/* While the area's line is empty, its separator goes with it. */}
                <span className="peer empty:hidden">{areaLine}</span>
                <span aria-hidden className="peer-empty:hidden">
                  ·
                </span>
                {view.badges.map((badge) => (
                  <Badge key={badge.label} variant={badge.variant}>
                    {badge.label}
                  </Badge>
                ))}
              </p>
              {view.addCover && (
                <div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={view.addCover.run}
                  >
                    {view.addCover.label}
                  </Button>
                </div>
              )}
              {actions}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0 md:flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <a href={view.publicLink.href} target="_blank" rel="noreferrer">
                <EyeIcon aria-hidden />
                {view.publicLink.label}
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={view.copyLink.run}>
              <CopyIcon aria-hidden />
              {view.copyLink.label}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {completeness === null ? (
            view.uncounted === null ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <p className="flex flex-wrap items-center gap-3 text-body-sm text-muted-foreground">
                <span>{view.uncounted.message}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={view.uncounted.retry.run}
                >
                  {view.uncounted.retry.label}
                </Button>
              </p>
            )
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span id="profile-completeness" className="text-label">
                  {completeness.label}
                </span>
                <span className="text-body-sm text-muted-foreground">{completeness.valueText}</span>
              </div>
              <Meter
                value={completeness.done}
                max={completeness.total}
                label={completeness.label}
                valueText={completeness.valueText}
              />
              {completeness.complete === null ? (
                <nav aria-label={completeness.issuesLabel}>
                  <ul className="flex flex-wrap gap-x-2 gap-y-1 text-body-sm">
                    {completeness.issues.map((issue, index) => (
                      <li key={issue.id} className="flex items-center gap-2">
                        {index > 0 && (
                          <span aria-hidden className="text-muted-foreground">
                            ·
                          </span>
                        )}
                        <Link
                          to={{ hash: issue.id }}
                          className="text-primary underline underline-offset-4"
                        >
                          {issue.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : (
                <p className="text-body-sm text-success-subtle-foreground">
                  {completeness.complete}
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
