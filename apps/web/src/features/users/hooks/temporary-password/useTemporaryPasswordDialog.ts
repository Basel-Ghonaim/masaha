import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { isolate } from '@shared/localisation';
import { HANDOVER_CHANNELS, type HandoverChannel } from '@masaha/shared/users';
import { useState } from 'react';
import { useHandover } from './useHandover';

export type TemporaryPasswordPerson = { userId: number; name: string; email: string };

export type TemporaryPasswordDialogInput = {
  person: TemporaryPasswordPerson;
  password: string;
  onDone: () => void;
  /** The element to focus when no channel is chosen; created by the caller so its ref is not read during render. */
  channelRef?: { current: HTMLDivElement | null };
};

/**
 * The one-time password dialog's state: the password is copied before it can be finished, the
 * handover channel is chosen before it is sent, and a refusal that is not "no longer pending"
 * keeps the dialog open with its reason.
 */
export function useTemporaryPasswordDialog({
  person,
  password,
  onDone,
  channelRef,
}: TemporaryPasswordDialogInput) {
  const copy = useCopy();
  const lines = copy.users.temporaryPassword;
  const handover = useHandover();

  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState<string | null>(null);
  const [channel, setChannel] = useState<HandoverChannel | undefined>(undefined);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<AppError | null>(null);
  // The ref is owned by the caller (created in the component), so it is never read during render here.

  // `blocked` holds while a 429's wait counts down, so «تم» waits with it as other forms' submits do.
  const { view: failure, blocked } = useRefusalView(refusal, lines.failed);

  async function copyRun() {
    try {
      await navigator.clipboard.writeText(password);
    } catch {
      setCopyFailed(lines.copyFailed);
    }
    setCopied(true);
  }

  async function doneRun() {
    if (channel === undefined) {
      setChannelError(lines.chooseChannel);
      channelRef?.current?.focus();
      return;
    }
    setRefusal(null);
    setChannelError(null);
    try {
      await handover.mutateAsync({ userId: person.userId, channel });
      const channelWord = lines.channels[channel];
      toast(lines.recorded({ name: isolate(person.name), channel: channelWord }));
      onDone();
    } catch (error) {
      const refused = toAppError(error);
      if (refused.code === 'TEMPORARY_PASSWORD_NOT_PENDING' || refused.status === 404) {
        toast.error(lines.notRecorded);
        onDone();
      } else {
        setRefusal(refused);
      }
    }
  }

  return {
    title: lines.title,
    person,
    password,
    copy: {
      label: lines.copy,
      copiedLabel: lines.copied,
      copied,
      run: copyRun,
    },
    copyFailed,
    line: lines.line,
    channel: {
      label: lines.channel,
      value: channel,
      options: HANDOVER_CHANNELS.map((value) => ({ value, label: lines.channels[value] })),
      choose: (value: HandoverChannel) => {
        setChannel(value);
        setChannelError(null);
      },
      error: channelError,
    },
    done: {
      label: lines.done,
      disabled: !copied || blocked,
      reason: copied ? undefined : lines.copyFirst,
      busy: handover.isPending,
      run: doneRun,
    },
    failure,
  };
}
