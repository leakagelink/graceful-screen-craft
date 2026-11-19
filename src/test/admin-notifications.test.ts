import { describe, expect, it } from 'vitest';
import { validateNotificationDraft } from '@/lib/admin-notifications';

describe('Admin notification composer', () => {
  it('requires a recipient when sending to one user', () => {
    expect(validateNotificationDraft('user', '', 'Update', 'Your trip is ready')).toBe('Choose a recipient.');
  });
  it('does not require a recipient for all users, shippers or drivers', () => {
    expect(validateNotificationDraft('all', '', 'Update', 'Scheduled maintenance')).toBeNull();
    expect(validateNotificationDraft('shippers', '', 'Update', 'Booking update')).toBeNull();
    expect(validateNotificationDraft('drivers', '', 'Update', 'New load information')).toBeNull();
  });
  it('requires both title and message', () => {
    expect(validateNotificationDraft('all', '', '', 'Message')).toBe('Enter a notification title.');
    expect(validateNotificationDraft('all', '', 'Title', '')).toBe('Enter a notification message.');
  });
  it('limits titles to 100 and messages to 500 characters', () => {
    expect(validateNotificationDraft('all', '', 'x'.repeat(101), 'Message')).toBe('Keep the title within 100 characters.');
    expect(validateNotificationDraft('all', '', 'Title', 'x'.repeat(501))).toBe('Keep the message within 500 characters.');
  });
});
