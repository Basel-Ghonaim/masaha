import { ClosureNotice, SpaceAnnouncements } from '@features/announcements';
import { ReportAction } from '@features/data-reports';
import {
  SpaceDetails,
  useDirectoryReturn,
  useSpaceContactBar,
  useSpacePageTitle,
} from '@features/directory';
import { AreaName } from '@features/lookups';
import { PlatformContact } from '@features/platform-settings';
import { useCopy } from '@shared/copy';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  ChevronStartIcon,
  useMediaQuery,
} from '@shared/design-system';
import { useRecordTitle } from '@shared/routing';
import { Link, useNavigate, useParams } from 'react-router';
import { SITE_PATHS } from '../../navigation';
import { useFooterRoom } from '../../shell/footerRoom';
import { useHeart } from '../useHeart';
import { useSignInPrompt } from '../useSignInPrompt';

/** From here up the page shows the breadcrumb; below it, a link back to the spaces. */
const TABLET_UP = '(min-width: 768px)';

// The lookups' area name set in the page's slot, made once so it is the same between renders.
const areaName = (areaId: number) => <AreaName areaId={areaId} source="public" />;

/**
 * A space's page on the site, by its slug, titled by the space's name once it has loaded: from
 * 768 px a breadcrumb «الرئيسية» › «المساحات» (back to the directory's last search) › the name;
 * below it, «العودة إلى المساحات». Then the space's details, its area named by lookups, the
 * platform's contact in an unverified space's dialog, favorites' heart beside its name,
 * announcements' running closure at the top and the others after the status, and data-reports'
 * «الإبلاغ عن معلومة غير صحيحة» at their end; a guest's press of either asks them to
 * sign in, with the reason.
 */
export function SpacePage() {
  const { slug = '' } = useParams();
  const copy = useCopy();
  const words = copy.directory.page;
  const title = useSpacePageTitle(slug);
  useRecordTitle(title);
  useFooterRoom(useSpaceContactBar(slug));
  const back = `${SITE_PATHS.spaces}${useDirectoryReturn()}`;
  const tablet = useMediaQuery(TABLET_UP);
  const stateTitle = title?.text ?? copy.site.links.space;
  const navigate = useNavigate();
  const { signIn, prompt } = useSignInPrompt();
  const heart = useHeart(signIn);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
      {tablet ? (
        <Breadcrumb label={words.breadcrumb}>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={SITE_PATHS.home}>{copy.site.links.home}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={back}>{copy.site.links.spaces}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage lang={title?.lang} dir={title?.dir}>
                {stateTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      ) : (
        <Button asChild variant="link" size="sm" className="self-start px-0">
          <Link to={back}>
            <ChevronStartIcon aria-hidden />
            {words.back}
          </Link>
        </Button>
      )}
      <SpaceDetails
        slug={slug}
        areaName={areaName}
        browseLink={SITE_PATHS.spaces}
        ownerContact={
          <PlatformContact
            layout="column"
            none={<p className="text-body-sm text-muted-foreground">{words.dialog.none}</p>}
          />
        }
        heart={(space) => heart(space)}
        notice={(items) => <ClosureNotice items={items} />}
        announcements={(items) => <SpaceAnnouncements items={items} />}
        report={(space) => (
          <ReportAction
            slug={space.slug}
            name={space.name}
            verified={space.verified}
            signIn={signIn}
            openMyReports={() => {
              void navigate(SITE_PATHS.myReports);
            }}
          />
        )}
      />
      {prompt}
    </div>
  );
}
