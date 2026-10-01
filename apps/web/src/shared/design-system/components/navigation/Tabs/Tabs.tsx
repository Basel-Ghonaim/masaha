import { cva, type VariantProps } from 'class-variance-authority';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { createContext, use, type ComponentProps } from 'react';
import { cn } from '../../../lib/cn';

/**
 * Switches between views of one place: a status filter over a list, or the sections of a page. The
 * arrow keys move between tabs along the reading direction.
 */
export function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    />
  );
}

// default: pills in a row that scrolls on a phone, as in the Owner › Members stress test, and a
// segmented control from the tablet up. line: an underlined row, for the sections of a page.
const tabsListVariants = cva('flex items-center', {
  variants: {
    variant: {
      default:
        'max-w-full gap-2 overflow-x-auto md:w-fit md:gap-0 md:overflow-visible md:rounded-lg md:bg-muted md:p-1',
      line: 'gap-4 border-b border-border',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const tabsTriggerVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center gap-1.5 text-label whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        default:
          'h-9 rounded-full border border-(--card-border) bg-card px-3 text-foreground pointer-coarse:h-(--control-height) not-data-active:hover:bg-accent not-data-active:hover:text-accent-foreground data-active:border-primary data-active:bg-primary data-active:text-primary-foreground md:h-8 md:rounded-md md:border-transparent md:bg-transparent md:text-muted-foreground md:not-data-active:hover:bg-transparent md:not-data-active:hover:text-foreground md:data-active:border-transparent md:data-active:bg-card md:data-active:text-foreground md:data-active:shadow-raised',
        line: 'h-10 px-1 text-muted-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary after:opacity-0 hover:text-foreground data-active:text-foreground data-active:after:opacity-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type TabsVariant = NonNullable<VariantProps<typeof tabsListVariants>['variant']>;

const TabsVariantContext = createContext<TabsVariant>('default');

export type TabsListProps = ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>;

/** The row of tabs. Name it (`aria-label`) when nothing on the page already does. */
export function TabsList({ className, variant, ...props }: TabsListProps) {
  return (
    <TabsVariantContext value={variant ?? 'default'}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        className={cn(tabsListVariants({ variant }), className)}
        {...props}
      />
    </TabsVariantContext>
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = use(TabsVariantContext);

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        // Not outline-none: in Tailwind 4 it empties the outline style that focus-visible:outline-2 uses.
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  );
}
