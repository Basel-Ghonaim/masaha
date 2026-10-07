import type { Catalogue } from '../shape';

export const SPACES = {
  menu: {
    actions: ({ name }: { name: string }) => `إجراءات: ${name}`,
    hide: 'إخفاء',
    show: 'إظهار',
    delete: 'حذف',
  },
  deleteDialog: {
    title: ({ name }: { name: string }) => `حذف ${name}؟`,
    description: 'تختفي من الموقع ومن هذه القائمة، ويمكنك التراجع فور الحذف.',
    cancel: 'إلغاء',
    confirm: 'حذف',
  },
  toasts: {
    hidden: ({ name }: { name: string }) => `أُخفيت ${name} من الموقع`,
    shown: ({ name }: { name: string }) => `أصبحت ${name} ظاهرة`,
    deleted: ({ name }: { name: string }) => `حُذفت ${name}`,
    undo: 'تراجع',
    restored: ({ name }: { name: string }) => `استُرجعت ${name}`,
  },
  failures: {
    hide: ({ name }: { name: string }) => `تعذّر إخفاء ${name}`,
    show: ({ name }: { name: string }) => `تعذّر إظهار ${name}`,
    delete: ({ name }: { name: string }) => `تعذّر حذف ${name}`,
    restore: ({ name }: { name: string }) => `تعذّر استرجاع ${name}`,
  },
} satisfies Catalogue['spaces'];
