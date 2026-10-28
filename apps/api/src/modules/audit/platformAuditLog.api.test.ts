import type { AddedStaff } from '@masaha/shared/space-links';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { adminRequest, dataOf, errorOf, REFUSED_CALLERS, signIn } from '../../../test/admin.ts';
import { createSpace, createUser } from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

// The admin's audit log of the platform's events (docs/api/api-contract.md › Audit log): a
// default-deny list, never a space's operations, money, people or staff (ADR 0002, 0009). Entries
// are inserted directly, so the reader is proven apart from the writers; a staff account's are
// written through the real routes, since its writers name the space.
const NOW = new Date('2026-11-10T10:00:00+02:00');
const app = createTestApp({ clock: () => NOW });
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);

let spaceId: number;
let otherSpaceId: number;
let owner: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
  ({ id: otherSpaceId } = await createSpace('other-space'));
  await prisma.space.update({
    where: { id: otherSpaceId },
    data: { nameEn: 'Gone Hub', nameAr: null, deletedAt: hoursAgo(1) },
  });
  admin = await signIn('ADMIN');
  await prisma.user.update({ where: { id: admin.id }, data: { name: 'Rami' } });
});

/** An entry by the admin about the space, an hour ago, unless overridden. */
function entry(data: Partial<Prisma.AuditLogUncheckedCreateInput> = {}) {
  return prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'space.hidden',
      entityType: 'space',
      entityId: spaceId,
      spaceId,
      createdAt: hoursAgo(1),
      ...data,
    },
  });
}

const log = (query = '', caller: { authorization: string } = admin) =>
  adminRequest(app, caller, 'get', `/audit-log${query}`);

interface Row {
  id: number;
  action: string;
  actor: { kind: string; id?: number; name?: string };
  target: { name: string | null; nameAr: string | null };
  space: { id: number; nameEn: string; nameAr: string | null; deleted: boolean } | null;
}

const rowsOf = (response: { body: unknown }) => dataOf(response as never) as Row[];
const idsOf = (response: { body: unknown }) => rowsOf(response).map(({ id }) => id);
const sorted = (ids: number[]) => [...ids].sort((a, b) => a - b);

describe("the admin's log", () => {
  it("the admin reads the platform's events of every space and of none, and never a space's operations, money, people, settings or staff", async () => {
    const area = await prisma.area.findFirstOrThrow();
    const suspended = await createUser('nadia@example.com');
    const platform = [
      await entry(),
      await entry({ action: 'space.ownerLinked', after: { userId: owner.id } }),
      await entry({
        action: 'user.suspended',
        entityType: 'user',
        entityId: suspended.id,
        spaceId: null,
      }),
      await entry({ action: 'area.edited', entityType: 'area', entityId: area.id, spaceId: null }),
      await entry({
        actorId: owner.id,
        action: 'dataReport.resolved',
        entityType: 'dataReport',
        entityId: 1,
      }),
      await entry({ action: 'space.deleted', spaceId: otherSpaceId, entityId: otherSpaceId }),
    ];
    const never = [
      ['payment.recorded', 'payment'],
      ['visit.checkedIn', 'visit'],
      ['checkIn.checkedIn', 'checkIn'],
      ['subscription.created', 'subscription'],
      ['customer.created', 'customer'],
      ['package.created', 'package'],
      ['announcement.created', 'announcement'],
      ['closure.subscriptionsExtended', 'announcement'],
      ['space.capacityEdited', 'space'],
      ['space.statusOverridden', 'space'],
      ['space.settingsEdited', 'space'],
      ['space.staffAdded', 'space'],
      // Default deny: an action on no list.
      ['space.somethingNew', 'space'],
    ] as const;
    for (const [action, entityType] of never) {
      await entry({ actorId: owner.id, action, entityType, entityId: 1 });
    }

    const response = await log('?period=ALL');

    expect(response.status).toBe(200);
    expect(sorted(idsOf(response))).toEqual(sorted(platform.map(({ id }) => id)));
    expect((response.body as { meta: { totalRecords: number } }).meta.totalRecords).toBe(6);
  });

  it("an account's event that names a space (an owner's staff) is the space's, never the admin's; the admin's own are listed", async () => {
    const staff = await createUser('reception@example.com');
    await entry({
      actorId: owner.id,
      action: 'user.temporaryPasswordIssued',
      entityType: 'user',
      entityId: staff.id,
    });
    await entry({
      actorId: owner.id,
      action: 'user.temporaryPasswordHandedOver',
      entityType: 'user',
      entityId: staff.id,
    });
    const platforms = [
      await entry({
        action: 'user.temporaryPasswordIssued',
        entityType: 'user',
        entityId: staff.id,
        spaceId: null,
      }),
      await entry({
        action: 'user.created',
        entityType: 'user',
        entityId: staff.id,
        spaceId: null,
      }),
    ];

    expect(sorted(idsOf(await log()))).toEqual(sorted(platforms.map(({ id }) => id)));
  });

  it("an owner's reception account's creation and email correction, through the routes, are the space's, never the admin's; the admin's creation of an owner is the admin's", async () => {
    const added = await request(app)
      .post(`/api/v1/manage/spaces/${String(spaceId)}/staff`)
      .set('Authorization', owner.authorization)
      .send({ name: 'Hala', email: 'hala@example.com' });
    expect(added.status).toBe(201);
    const { userId, temporaryPassword } = dataOf(added) as AddedStaff;
    const signedIn = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hala@example.com', password: temporaryPassword });
    const { accessToken } = (signedIn.body as { data: { accessToken: string } }).data;
    const changed = await request(app)
      .post('/api/v1/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: 'mine2026x', email: 'hala.odeh@example.com' });
    expect(changed.status).toBe(200);
    const { id: thirdSpaceId } = await createSpace('third-space');
    const ownerAdded = await adminRequest(app, admin, 'post', '/owners', {
      spaceId: thirdSpaceId,
      name: 'Nour Salem',
      email: 'nour@example.com',
    });
    expect(ownerAdded.status).toBe(201);
    const accountEvents = (rows: Row[]) =>
      rows
        .filter(({ action }) => action.startsWith('user.'))
        .map(({ action, actor, target }) => ({ action, actor, target: target.name }));

    expect(accountEvents(rowsOf(await log('?period=ALL')))).toEqual([
      {
        action: 'user.created',
        actor: { kind: 'PERSON', id: admin.id, name: 'Rami' },
        target: 'Nour Salem',
      },
    ]);
    const spaceLog = await request(app)
      .get(`/api/v1/manage/spaces/${String(spaceId)}/audit-log?period=ALL`)
      .set('Authorization', owner.authorization);
    expect(accountEvents(rowsOf(spaceLog))).toEqual([
      {
        action: 'user.emailChanged',
        actor: { kind: 'PERSON', id: userId, name: 'Hala' },
        target: 'Hala',
      },
      {
        action: 'user.created',
        actor: { kind: 'PERSON', id: owner.id, name: 'Ahmad' },
        target: 'Hala',
      },
    ]);
  });

  it("the three settings actions are on the admin's log, the target typed platformSettings with no id", async () => {
    await prisma.setting.createMany({
      data: [
        { key: 'stalenessDays', value: 60 },
        { key: 'priceStalenessDays', value: 30 },
        {
          key: 'newSpaceDefaults',
          value: {
            autoCheckoutAtClosing: true,
            visitRounding: 'PER_MINUTE',
            visitRoundingMinutes: null,
            visitCapAtDayPrice: true,
          },
        },
      ],
    });
    const saves = [
      await adminRequest(app, admin, 'put', '/settings/new-space-defaults', {
        autoCheckoutAtClosing: false,
        visitRounding: 'PER_MINUTE',
        visitRoundingMinutes: null,
        visitCapAtDayPrice: true,
      }),
      await adminRequest(app, admin, 'put', '/settings/staleness', {
        stalenessDays: 45,
        priceStalenessDays: 30,
      }),
      await adminRequest(app, admin, 'put', '/settings/contact', {
        email: 'hello@masaha.ps',
        whatsapp: null,
      }),
    ];
    expect(saves.map(({ status }) => status)).toEqual([200, 200, 200]);

    const response = await log('?period=ALL');

    expect(response.status).toBe(200);
    expect(
      (dataOf(response) as (Row & { target: { type: string; id: number | null } })[]).map(
        ({ action, actor, target, space }) => ({ action, actor, target, space }),
      ),
    ).toEqual(
      [
        'platformSettings.contactEdited',
        'platformSettings.stalenessEdited',
        'platformSettings.newSpaceDefaultsEdited',
      ].map((action) => ({
        action,
        actor: { kind: 'PERSON', id: admin.id, name: 'Rami' },
        target: { type: 'platformSettings', id: null, name: null, nameAr: null, deleted: false },
        space: null,
      })),
    );
  });

  it("q finds a space's entries by its name, a person's by name, an area's by its Arabic name; each entry carries its space, a deleted one marked", async () => {
    const area = await prisma.area.findFirstOrThrow();
    const nadia = await createUser('nadia@example.com');
    await prisma.user.update({ where: { id: nadia.id }, data: { name: 'Nadia Odeh' } });
    const hidden = await entry({ createdAt: hoursAgo(1) });
    const decided = await entry({
      action: 'dataReport.resolved',
      entityType: 'dataReport',
      entityId: 1,
      createdAt: hoursAgo(2),
    });
    const suspended = await entry({
      action: 'user.suspended',
      entityType: 'user',
      entityId: nadia.id,
      spaceId: null,
      createdAt: hoursAgo(3),
    });
    const edited = await entry({
      action: 'area.edited',
      entityType: 'area',
      entityId: area.id,
      spaceId: null,
      createdAt: hoursAgo(4),
    });
    const deleted = await entry({
      action: 'space.deleted',
      entityId: otherSpaceId,
      spaceId: otherSpaceId,
      createdAt: hoursAgo(5),
    });

    expect(idsOf(await log('?q=focus'))).toEqual([hidden.id, decided.id]);
    expect(idsOf(await log(`?q=${encodeURIComponent('فوكس')}`))).toEqual([hidden.id, decided.id]);
    expect(idsOf(await log('?q=odeh'))).toEqual([suspended.id]);
    expect(idsOf(await log(`?q=${encodeURIComponent('النصر')}`))).toEqual([edited.id]);

    const spaces = new Map(rowsOf(await log()).map(({ id, space }) => [id, space]));
    expect(spaces.get(decided.id)).toEqual({
      id: spaceId,
      nameEn: 'Focus Hub',
      nameAr: 'فوكس هاب',
      deleted: false,
    });
    expect(spaces.get(deleted.id)).toEqual({
      id: otherSpaceId,
      nameEn: 'Gone Hub',
      nameAr: null,
      deleted: true,
    });
    expect(spaces.get(suspended.id)).toBeNull();
  });

  it("actor narrows to one person; meta.actors the period's persons", async () => {
    const second = await signIn('ADMIN', 'second-admin@example.com');
    await prisma.user.update({ where: { id: second.id }, data: { name: 'Basma' } });
    await entry({ createdAt: hoursAgo(1) });
    const bySecond = await entry({ actorId: second.id, createdAt: hoursAgo(2) });
    await entry({ actorId: owner.id, action: 'space.profileEdited', createdAt: hoursAgo(3) });
    await entry({ createdAt: hoursAgo(4) });
    // Before the period: not its actors.
    const old = await signIn('ADMIN', 'old-admin@example.com');
    await entry({ actorId: old.id, createdAt: new Date('2026-09-01T10:00:00+03:00') });

    const narrowed = await log(`?actor=${String(second.id)}`);
    expect(idsOf(narrowed)).toEqual([bySecond.id]);
    const { meta } = narrowed.body as { meta: { totalRecords: number; actors: unknown[] } };
    expect(meta.totalRecords).toBe(1);
    expect(meta.actors).toEqual([
      { kind: 'PERSON', id: owner.id, name: 'Ahmad' },
      { kind: 'PERSON', id: second.id, name: 'Basma' },
      { kind: 'PERSON', id: admin.id, name: 'Rami' },
    ]);

    const invalid = await log('?actor=MASAHA');
    expect(invalid.status).toBe(422);
    expect(errorOf(invalid).errors).toEqual({ actor: ['invalid_format'] });
  });

  it.each(REFUSED_CALLERS)('$caller is $status', async ({ caller, status, type, code }) => {
    await entry();

    const response = await adminRequest(app, caller, 'get', '/audit-log');

    expect(response.status).toBe(status);
    expect(errorOf(response).type).toBe(type);
    expect(errorOf(response).code).toBe(code);
  });
});
