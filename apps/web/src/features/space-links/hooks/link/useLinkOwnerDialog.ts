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
import { useSpaceOwnersQuery } from '../useSpaceOwnersQuery';
import { useLinkOwner } from './useLinkOwner';
import { usePersonChoices } from './usePersonChoices';

/**
 * The link dialog, ready to render, from either end: from a space, one person to choose (owners and
 * users, by name or email), the space's owners read afresh as it opens (finding 95: one linked
 * meanwhile is worded as another owner, and the submit waits for the read); from a person, one space (each with its state and owners, theirs
 * already and those whose front desk they work offered but not to be chosen). Before the act it
 * says what the link does, from the chosen option's own facts: an unverified space becomes
 * verified, a verified one gains another owner, and a user's account becomes an owner's — said only
 * when it is certain. Nothing chosen sends nothing and points to the field. A refusal is worded in
 * the dialog, which stays open; a new choice forgets it. Linked, the dialog closes (`close`).
 */
export function useLinkOwnerDialog(target: LinkTarget, close: () => void) {
  const copy = useCopy();
  const lines = copy.spaceLinks.link;
  const link = useLinkOwner();
  const fromSpace = target.from === 'space';
  const people = usePersonChoices({ enabled: fromSpace });
  // From a space, its owners as the server reads them now, not as the editor read them.
  const owners = useSpaceOwnersQuery(target.from === 'space' ? target.space.id : 0, fromSpace);
  const hasOwner = owners.data !== undefined && owners.data.length > 0;
  const spaces = useSpaceChoices({
    enabled: !fromSpace,
    linked: target.from === 'person' ? target.person.spaceIds : [],
    desks: target.from === 'person' ? target.person.deskIds : [],
  });
  const [person, setPerson] = useState<PersonChoiceView | null>(null);
  const [chosenSpace, setSpace] = useState<SpaceChoiceView | null>(
    target.from === 'person' ? (target.space ?? null) : null,
  );
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

  // The space and whether it is verified, whether the person is a user, and the front desks they
  // work, as the choice says.
  const facts =
    target.from === 'space'
      ? person === null
        ? null
        : {
            space: target.space.name,
            verified: hasOwner,
            user: person.role === 'USER',
            desks: person.desks,
          }
      : space === null
        ? null
        : {
            space: space.name,
            verified: space.isVerified,
            user: target.person.role === 'USER',
            desks: null,
          };

  const consequence: (NamedLineView | string)[] =
    facts === null
      ? []
      : [
          facts.verified
            ? namedLine(({ name }) => lines.anotherOwner({ space: name }), facts.space)
            : namedLine(({ name }) => lines.becomesVerified({ space: name }), facts.space),
          ...(facts.user ? [lines.becomesOwner] : []),
          ...(facts.desks === null ? [] : [lines.staysAtDesk({ spaces: facts.desks })]),
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
    description: fromSpace ? (hasOwner ? lines.hasOwner : lines.noOwner) : lines.oneAtATime,
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
    submit: {
      label: lines.submit,
      run,
      // From a space, the submit waits for the fresh read of its owners.
      busy: link.isPending || (fromSpace && owners.isFetching),
      blocked,
    },
    failure,
    closeLabel: lines.close,
  };
}
