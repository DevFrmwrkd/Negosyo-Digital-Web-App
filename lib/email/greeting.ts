/**
 * What to call someone at the top of an email.
 *
 * Every sender used `${firstName} ${lastName}` because that string was already
 * being built for other purposes, which put full legal names into greetings:
 * "Hi Steven Madali," / "Hi Jefferson kam,". That reads as a form letter, and
 * it reads worst on exactly the messages meant to sound personal — a payout
 * notice and an announcement.
 *
 * First name only. Falls back to the last name, then to "there" — never to an
 * email address, because "Hi jeffersonkam28@gmail.com," is worse than the
 * generic greeting it was trying to avoid.
 *
 * Deliberately NOT used for the admin-facing recipient preview, where a full
 * name is what identifies the person being mailed.
 */
export function greetingName(person: {
    firstName?: string | null;
    lastName?: string | null;
}): string {
    const first = (person.firstName || '').trim();
    if (first) return first;

    const last = (person.lastName || '').trim();
    if (last) return last;

    return 'there';
}
