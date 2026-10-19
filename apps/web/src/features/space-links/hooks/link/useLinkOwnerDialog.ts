import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { isolate } from '@shared/localisation';
import { useRef, useState } from 'react';
import { namedLine } from '../../services/namedLine';
import type { LinkTarget } from '../../types/LinkTarget';
import type { NamedLineView } from '../../types/NamedLineView';
import type { PersonChoiceView } from '../../types/PersonChoiceView';
import type { SpaceChoiceView } from '../../types/SpaceChoiceView';
import { useSpaceChoices } from '../useSpaceChoices';
import { useLinkOwner } from './useLinkOwner';
import { usePersonChoices } from './usePersonChoices';

/**
 * The link dialog, ready to render, from either end: from a space, one person to choose (owners and
 * users, by name or email); from a person, one space (each with its state and owners, theirs already
 * offered but not to be chosen). Before the act it says what the link does, from the chosen option's
 * own facts: an unverified space becomes verified, a verified one gains another owner, and a user's
 * account becomes an owner's — said only when it is certain. Nothing chosen sends nothing and points
 * to the field. A refusal is worded in the dialog, which stays open; a new choice forgets it. Linked,
 * the dialog closes (`close`).
 */
export function useLinkOwnerDialog(target: LinkTarget, close: () => void) {
  const copy = useCopy();
  const lines = copy.spaceLinks.link;
  const link = useLinkOwner();
  const fromSpace = target.from === 'space';
  const people = usePersonChoices({ enabled: fromSpace });
  const spaces = useSpaceChoices({
    enabled: !fromSpace,
    linked: target.from === 'person' ? target.person.spaceIds : [],
  });
  const [person, setPerson] = useState<PersonChoiceView | null>(null);
  const [chosenSpace, setSpace] = useState<SpaceChoiceView | null>(null);
  const [missing, setMissing] = useState(false);
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // The chosen space as the latest answer words it, so a link made meanwhile is said as it is now;
  // as it was chosen when the search has moved on and no longer lists it.
  const space = spaces.options.find((option) => option.id === chosenSpace?.id) ?? chosenSpace;
  const { view: failure, blocked } = useRefusalView(refusal, lines.failed, lines.refusals);

  // A new choice is a new question: the last refusal and the missing choice no longer hold.
  const chosen = () => {
    setMissing(false);
    setRefusal(null);
  };

  // The space and whether it is verified, and whether the person is a user, as the choice says.
  const facts =
    target.from === 'space'
      ? person === null
        ? null
        : { space: target.space.name, verified: false, user: person.role === 'USER' }
      : space === null
        ? null
        : { space: space.name, verified: space.isVerified, user: false };

  const consequence: (NamedLineView | string)[] =
    facts === null
      ? []
      : [
          facts.verified
            ? namedLine(({ name }) => lines.anotherOwner({ space: name }), facts.space)
            : namedLine(({ name }) => lines.becomesVerified({ space: name }), facts.space),
          ...(facts.user ? [lines.becomesOwner] : []),
        ];

  const placeholder = fromSpace ? lines.choosePerson : lines.chooseSpace;

  const run = async () => {
    const spaceId = target.from === 'space' ? target.space.id : space?.id;
    const userId = target.from === 'person' ? target.person.id : person?.id;
    if (spaceId === undefined || userId === undefined || facts === null) {
      setMissing(true);
      triggerRef.current?.focus();
      return;
    }
    setRefusal(null);
    try {
      await link.mutateAsync({
        spaceId,
        userId,
        toast: {
          person: target.from === 'person' ? target.person.name : (person?.name ?? ''),
          space: facts.space,
          wasVerified: facts.verified,
        },
      });
      close();
    } catch (error) {
      setRefusal(toAppError(error));
    }
  };

  return {
    title:
      target.from === 'space'
        ? namedLine(({ name }) => lines.titleFromSpace({ space: name }), target.space.name)
        : lines.titleFromPerson({ name: isolate(target.person.name) }),
    description: fromSpace ? lines.noOwner : lines.oneAtATime,
    field: {
      label: fromSpace ? lines.person : lines.space,
      helper: fromSpace ? lines.personHelper : undefined,
      placeholder,
      error: missing ? placeholder : undefined,
    },
    triggerRef,
    picker: fromSpace
      ? {
          from: 'space' as const,
          choices: people,
          chosen: person,
          choose: (choice: PersonChoiceView) => {
            setPerson(choice);
            chosen();
          },
        }
      : {
          from: 'person' as const,
          choices: spaces,
          chosen: space,
          choose: (choice: SpaceChoiceView) => {
            setSpace(choice);
            chosen();
          },
        },
    consequence,
    addOwner:
      target.from === 'space' ? { text: lines.addOwner, link: target.addOwnerLink } : undefined,
    submit: { label: lines.submit, run, busy: link.isPending, blocked },
    failure,
    closeLabel: lines.close,
  };
}
