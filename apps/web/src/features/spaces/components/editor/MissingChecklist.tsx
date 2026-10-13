import type { FactGroup } from '@masaha/shared/spaces';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { Link } from 'react-router';

type ChecklistItem = {
  group: FactGroup;
  label: string;
  /** The section's anchor, once the editor draws it, as the router's link to it. */
  href: string | null;
  status: string;
  variant: 'success' | 'warning';
};

/** «ما زال ناقصًا»: the five fact groups, each done or not yet added, a drawn section's line its link. */
export function MissingChecklist({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: ChecklistItem[];
}) {
  return (
    <Card role="region" aria-labelledby="missing-title">
      <CardHeader>
        <CardTitle>
          <h2 id="missing-title">{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li key={item.group} className="flex items-center justify-between gap-3 py-2">
              {item.href === null ? (
                <span className="text-body">{item.label}</span>
              ) : (
                <Link
                  to={{ hash: item.href }}
                  className="text-body text-primary underline-offset-4 hover:underline"
                >
                  {item.label}
                </Link>
              )}
              <Badge variant={item.variant}>{item.status}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
