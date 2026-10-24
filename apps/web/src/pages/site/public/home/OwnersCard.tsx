import { useCopy } from '@shared/copy';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { Link } from 'react-router';
import { SITE_PATHS } from '../../navigation';

/** Home's card for space owners: what Masaha offers them, and «تواصل معنا» to About's owners' part. */
export function OwnersCard() {
  const words = useCopy().site.home.owners;

  return (
    <Card className="bg-muted">
      <CardHeader>
        <CardTitle>
          <h2>{words.title}</h2>
        </CardTitle>
        <CardDescription>{words.text}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link to={SITE_PATHS.owners}>{words.action}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
