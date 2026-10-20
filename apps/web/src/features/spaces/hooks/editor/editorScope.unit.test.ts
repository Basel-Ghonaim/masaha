import { describe, expect, it } from 'vitest';
import { EDITOR_SCOPES } from './editorScope';

describe('the editor’s scopes', () => {
  it('keeps the owner’s space under the space’s scope and the admin’s under the admin’s', () => {
    expect(EDITOR_SCOPES.admin.spaceKey(7)).toEqual(['admin', 'spaces', 'space', 7]);
    expect(EDITOR_SCOPES.admin.photosKey(7)).toEqual(['admin', 'spaces', 'photos', 7]);
    expect(EDITOR_SCOPES.admin.writeKey(7)).toEqual(['admin', 'spaces', 'write', 7]);
    expect(EDITOR_SCOPES.owner.spaceKey(7)).toEqual(['space', 7, 'spaces', 'space']);
    expect(EDITOR_SCOPES.owner.photosKey(7)).toEqual(['space', 7, 'spaces', 'photos']);
    expect(EDITOR_SCOPES.owner.writeKey(7)).toEqual(['space', 7, 'spaces', 'write']);
    expect(EDITOR_SCOPES.admin.lists).toEqual(['admin']);
    expect(EDITOR_SCOPES.owner.lists).toEqual(['public']);
  });

  it('marks the user’s scope after an owner’s write, the admin’s after the admin’s', () => {
    expect(EDITOR_SCOPES.owner.answered).toEqual(['me']);
    expect(EDITOR_SCOPES.admin.answered).toEqual(['admin']);
  });
});
