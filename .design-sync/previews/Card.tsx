import './_document';
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@masaha/design-system';

// Ported from the showcase's CardSection (apps/web/src/pages/showcase/sections/CardSection.tsx).

export function Complete() {
  return (
    <Card className="w-full max-w-96">
      <CardHeader>
        <CardTitle>ساعات العمل</CardTitle>
        <CardDescription>تظهر في صفحة المساحة العامة</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">
            تعديل
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>من السبت إلى الخميس، من 08:00 حتى 20:00. الجمعة مغلق.</CardContent>
      <CardFooter className="text-caption text-muted-foreground">آخر تحديث قبل يومين</CardFooter>
    </Card>
  );
}

export function ContentOnly() {
  return (
    <Card className="w-full max-w-96">
      <CardContent>مساحة هادئة قرب الجامعة، بإنترنت مستقر وكهرباء طوال اليوم.</CardContent>
    </Card>
  );
}
