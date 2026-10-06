import { Button, EmptyState } from '@shared/design-system';
import { useGovernoratesSection } from '../../hooks/list/useGovernoratesSection';
import { AddGovernorateForm } from '../sheet/AddGovernorateForm';
import { LookupSheet } from '../sheet/LookupSheet';
import { GovernorateCard } from './GovernorateCard';
import { GovernoratesLoading } from './GovernoratesLoading';

/**
 * The admin's governorates and their areas: one card per governorate, in order, hidden ones
 * included, then the sheet that adds a governorate. Self-contained, with its own loading, failed and
 * empty states, so a page can set it beside the other lookup lists. The add button stays in one
 * place whatever the state, so the sheet that adds the first governorate keeps its button, and the
 * focus returns to it.
 */
export function GovernoratesSection() {
  const section = useGovernoratesSection();

  return (
    <section aria-label={section.label} className="flex flex-col gap-4">
      {section.status === 'loading' && <GovernoratesLoading label={section.loadingLabel} />}
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
      {section.status === 'ready' &&
        section.governorates.map((governorate) => (
          <GovernorateCard key={governorate.id} governorate={governorate} />
        ))}
      <div>
        <LookupSheet sheet={section.add} variant="outline">
          {(close) => <AddGovernorateForm onSaved={close} />}
        </LookupSheet>
      </div>
    </section>
  );
}
