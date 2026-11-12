import type { ContactType } from '@masaha/shared/spaces';
import {
  AtSignIcon,
  BriefcaseIcon,
  CameraIcon,
  GlobeIcon,
  LinkIcon,
  MailIcon,
  MessageCircleIcon,
  MusicIcon,
  PhoneIcon,
  PlayIcon,
  SendIcon,
  ThumbsUpIcon,
  type IconProps,
} from '@shared/design-system';
import type { ComponentType } from 'react';

/** Each contact type's glyph: the layer draws no brand's mark, so each network is a plain one. */
export const CONTACT_ICONS: Record<ContactType, ComponentType<IconProps>> = {
  WHATSAPP: MessageCircleIcon,
  PHONE: PhoneIcon,
  EMAIL: MailIcon,
  INSTAGRAM: CameraIcon,
  FACEBOOK: ThumbsUpIcon,
  TELEGRAM: SendIcon,
  TIKTOK: MusicIcon,
  X: AtSignIcon,
  LINKEDIN: BriefcaseIcon,
  YOUTUBE: PlayIcon,
  WEBSITE: GlobeIcon,
  OTHER: LinkIcon,
};
