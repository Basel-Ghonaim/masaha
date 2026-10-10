import type { Catalogue } from '../shape';

export const SPACES = {
  add: {
    basics: 'الأساسيات',
    location: 'الموقع',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنجليزية',
    descriptionAr: 'الوصف بالعربية',
    descriptionEn: 'الوصف بالإنجليزية',
    area: 'المنطقة',
    addressAr: 'العنوان بالعربية',
    addressEn: 'العنوان بالإنجليزية',
    landmarkAr: 'علامة مميزة بالعربية',
    landmarkEn: 'علامة مميزة بالإنجليزية',
    optional: 'اختياري',
    pin: 'الموقع على الخريطة',
    map: 'خريطة قطاع غزة: اضغط لوضع دبوس المساحة',
    pinHint: 'اضغط على الخريطة لوضع الدبوس عند مدخل المساحة، ثم اسحبه لضبطه. أو أدخل إحداثياته.',
    coordinates: 'الإحداثيات',
    coordinatesHint: ({ example }: { example: string }) =>
      `خط العرض ثم خط الطول، كما تنسخهما الخريطة: ${example}`,
    submit: 'إضافة مساحة',
    failureTitle: 'تعذّرت إضافة المساحة',
    conflict: 'أُضيفت مساحة بالاسم نفسه في اللحظة ذاتها. أضِفها مرة أخرى.',
    fieldErrors: {
      nameEn: {
        too_short: 'أدخل الاسم بالإنجليزية',
        invalid_format: 'استخدم حروفًا لاتينية أو أرقامًا في الاسم الإنجليزي',
      },
      addressAr: { too_short: 'أدخل العنوان بالعربية' },
      areaId: {
        required: 'اختر المنطقة',
        invalid_choice: 'هذه المنطقة لم تعد متاحة. اختر غيرها.',
      },
      location: {
        required: 'ضع الدبوس على الخريطة أو أدخل إحداثياته',
        invalid_format: 'أدخل الإحداثيات: خط العرض ثم خط الطول',
        out_of_range: 'هذه النقطة خارج قطاع غزة',
      },
    },
  },
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
    added: ({ name }: { name: string }) => `أُضيفت ${name}`,
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
