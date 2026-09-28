import './_document';
import { Card, CardContent, Spinner } from '@masaha/design-system';

// Ported from the showcase's SpinnerSection (apps/web/src/pages/showcase/sections/SpinnerSection.tsx).

// The default size and a caller-sized one, each beside the text it announces.
export function Sizes() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
        <Spinner label="جارٍ تحميل المشتركين" />
        <span aria-hidden>جارٍ تحميل المشتركين…</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner label="جارٍ تحميل المشتركين" className="[&_svg]:size-6" />
        <span aria-hidden>جارٍ تحميل المشتركين…</span>
      </div>
    </div>
  );
}

// A list region while its first page loads.
export function InCard() {
  return (
    <Card className="w-full max-w-96" aria-busy>
      <CardContent>
        <div className="flex items-center justify-center gap-2 py-3 text-body-sm text-muted-foreground">
          <Spinner label="جارٍ تحميل المشتركين" />
          <span aria-hidden>جارٍ تحميل المشتركين…</span>
        </div>
      </CardContent>
    </Card>
  );
}
