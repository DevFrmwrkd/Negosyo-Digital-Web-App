import { greetingName } from '../../lib/email/greeting';

/**
 * Every sender used `${firstName} ${lastName}` because that string was already
 * being built for other purposes, so real creators were greeted by their full
 * legal name: "Hi Steven Madali," / "Hi Jefferson kam,". All 138 creators have
 * both names set, so this was not an edge case — it was every single email.
 */
describe('greetingName', () => {
    it('uses the first name alone', () => {
        expect(greetingName({ firstName: 'Steven', lastName: 'Madali' })).toBe('Steven');
        expect(greetingName({ firstName: 'Jefferson', lastName: 'kam' })).toBe('Jefferson');
    });

    it('falls back to the last name when there is no first', () => {
        expect(greetingName({ lastName: 'Madali' })).toBe('Madali');
        expect(greetingName({ firstName: '', lastName: 'Madali' })).toBe('Madali');
    });

    it('falls back to "there", never to an email address', () => {
        // "Hi jeffersonkam28@gmail.com," is worse than the generic greeting it
        // would be trying to avoid.
        expect(greetingName({})).toBe('there');
        expect(greetingName({ firstName: null, lastName: null })).toBe('there');
        expect(greetingName({ firstName: '   ', lastName: '  ' })).toBe('there');
    });

    it('trims stray whitespace from stored names', () => {
        expect(greetingName({ firstName: '  Brandon ', lastName: 'Baquiran' })).toBe('Brandon');
    });
});
