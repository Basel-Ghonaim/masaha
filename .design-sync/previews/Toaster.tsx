import './_document';
import { Toaster, toast } from '@masaha/design-system';
import { type ReactNode, useEffect } from 'react';

// Ported from the showcase's ToastSection (apps/web/src/pages/showcase/sections/ToastSection.tsx)
// and the Toaster that ShowcasePreview mounts. The toasts are raised once on mount (the Toaster's
// own effect subscribes first) and kept up, so the capture shows them.

const keep = { duration: Number.POSITIVE_INFINITY };

// The Toaster is fixed to a corner of its containing block. The card's root is one (it is
// transformed to contain fixed content), so the shell gives it the page's height, as the app's
// page shell does; without it the toasts sit above the top edge.
function PageShell({ children }: { children: ReactNode }) {
  return <div className="min-h-svh">{children}</div>;
}

export function Stack() {
  useEffect(() => {
    toast('نُشر الإعلان للمشتركين', keep);
    toast.success('سُجّل حضور سارة الحلو', keep);
    toast.info('يُحدَّث عدد المقاعد كل دقيقة', {
      ...keep,
      description: 'قد يتأخر قليلًا عند ضعف الاتصال.',
    });
    toast.warning('بقي 3 مقاعد فقط', keep);
    toast.error('تعذّر تسجيل الحضور', {
      ...keep,
      description: 'تحقّق من اتصالك ثم حاول مرة أخرى.',
    });
  }, []);
  return (
    <PageShell>
      <Toaster label="الإشعارات" closeLabel="إغلاق الإشعار" expand visibleToasts={5} />
    </PageShell>
  );
}

export function WithAction() {
  useEffect(() => {
    toast('أُلغي تنشيط المشترك', {
      ...keep,
      action: { label: 'تراجع عن الإلغاء', onClick: () => undefined },
    });
  }, []);
  return (
    <PageShell>
      <Toaster label="الإشعارات" closeLabel="إغلاق الإشعار" />
    </PageShell>
  );
}

export function ErrorWithDescription() {
  useEffect(() => {
    toast.error('تعذّر تسجيل الحضور', {
      ...keep,
      description: 'تحقّق من اتصالك ثم حاول مرة أخرى.',
    });
  }, []);
  return (
    <PageShell>
      <Toaster label="الإشعارات" closeLabel="إغلاق الإشعار" />
    </PageShell>
  );
}
