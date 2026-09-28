import { DirectionProvider, Toaster } from '@shared/design-system';
import { useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router';
import fixtures from './fixtures.json';
import {
  AlertDialogSection,
  AlertSection,
  AvatarSection,
  BadgeSection,
  BreadcrumbSection,
  ButtonSection,
  CardSection,
  CheckboxSection,
  DialogSection,
  DropdownMenuSection,
  EmptyStateSection,
  FieldSection,
  IconsSection,
  InputSection,
  PaginationSection,
  RadioGroupSection,
  SelectSection,
  SeparatorSection,
  SheetSection,
  SkeletonSection,
  SpinnerSection,
  StatCardSection,
  SwitchSection,
  TabsSection,
  TextareaSection,
  ToastSection,
  TogglesSection,
  TooltipSection,
} from './sections';
import { readSettings } from './settings';

/**
 * Every section in one theme and one language: the page inside the showcase's iframe. Like the app,
 * it sets data-theme, lang and dir on <html>, so content portalled to <body> (menus, dialogs)
 * matches too. Each component adds its section below.
 */
export function ShowcasePreview() {
  const [params] = useSearchParams();
  const { theme, language } = readSettings(params);
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const samples = fixtures.samples[language];

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.lang = language;
    root.dir = direction;
  }, [theme, language, direction]);

  return (
    <DirectionProvider dir={direction}>
      <main className="flex flex-col gap-12 p-6">
        <IconsSection samples={samples.icons} />
        <ButtonSection samples={samples.button} />
        <TogglesSection samples={samples.toggles} otherLanguage={language === 'ar' ? 'en' : 'ar'} />
        <FieldSection samples={samples.field} />
        <InputSection samples={samples.input} />
        <TextareaSection samples={samples.textarea} />
        <SelectSection samples={samples.select} />
        <CheckboxSection samples={samples.checkbox} />
        <RadioGroupSection samples={samples.radioGroup} />
        <SwitchSection samples={samples.switch} />
        <BadgeSection samples={samples.badge} />
        <CardSection samples={samples.card} />
        <SeparatorSection samples={samples.separator} />
        <AvatarSection samples={samples.avatar} />
        <SkeletonSection samples={samples.skeleton} />
        <SpinnerSection samples={samples.spinner} />
        <AlertSection samples={samples.alert} />
        <TooltipSection samples={samples.tooltip} />
        <ToastSection samples={samples.toast} />
        <EmptyStateSection samples={samples.emptyState} />
        <StatCardSection samples={samples.statCard} />
        <DialogSection samples={samples.dialog} />
        <AlertDialogSection samples={samples.alertDialog} />
        <SheetSection samples={samples.sheet} />
        <DropdownMenuSection samples={samples.dropdownMenu} />
        <TabsSection samples={samples.tabs} />
        <BreadcrumbSection samples={samples.breadcrumb} />
        <PaginationSection samples={samples.pagination} />
      </main>
      <Toaster label={samples.toaster.label} closeLabel={samples.toaster.closeLabel} />
    </DirectionProvider>
  );
}
