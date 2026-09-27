import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '.';

describe('Card', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Opening hours</CardTitle>
          <CardDescription>Shown on the space's public page</CardDescription>
          <CardAction>
            <button type="button">Edit</button>
          </CardAction>
        </CardHeader>
        <CardContent>Saturday to Thursday, 8:00 to 20:00</CardContent>
        <CardFooter>Updated 2 days ago</CardFooter>
      </Card>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
