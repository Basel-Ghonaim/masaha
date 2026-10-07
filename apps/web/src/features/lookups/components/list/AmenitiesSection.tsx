import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useAmenitiesSection } from '../../hooks/list/useAmenitiesSection';
import { AmenitiesLoading } from './AmenitiesLoading';
import { AmenityRow } from './AmenityRow';

/**
 * The admin's amenities: one card with its title and its line, then the failure of an order, and one
 * row per amenity, in order, retired ones included, each with its own failure. Self-contained, with its own
 * loading, failed and empty states, so a page can set it beside the other lookup lists.
 */
export function AmenitiesSection() {
  const section = useAmenitiesSection();

  return (
    <section aria-label={section.title}>
      <Card>
        <CardHeader className="flex flex-col gap-1">
          <CardTitle>
            <h2>{section.title}</h2>
          </CardTitle>
          <CardDescription>{section.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {section.status === 'loading' && <AmenitiesLoading label={section.loadingLabel} />}
          {section.status === 'error' && (
            <EmptyState
              title={section.failure.title}
              description={
                <>
                  {section.failure.message}
                  {section.failure.reference !== undefined && (
                    <span className="block">{section.failure.reference}</span>
                  )}
                </>
              }
            >
              <Button
                variant="outline"
                disabled={section.failure.blocked}
                onClick={section.failure.retry}
              >
                {section.failure.retryLabel}
              </Button>
            </EmptyState>
          )}
          {section.status === 'empty' && (
            <EmptyState title={section.empty.title} description={section.empty.description} />
          )}
          {section.orderFailure && <FormFailure view={section.orderFailure} />}
          {section.status === 'ready' && (
            <ul className="divide-y divide-border rounded-md border border-border">
              {section.amenities.map((amenity) => (
                <AmenityRow key={amenity.id} amenity={amenity} blocked={section.blocked} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
