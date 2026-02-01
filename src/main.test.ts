/**
 * This is a dummy TypeScript test file using chai and mocha
 *
 * It's automatically excluded from npm and its build output is excluded from both git and npm.
 * It is advised to test all your modules with accompanying *.test.ts-files
 */

import { expect } from 'chai';
import Verisure from './main';

describe('Verisure adapter config', () => {
	it('should expose username and password config fields', () => {
		const adapter = new Verisure({ name: 'verisure' } as any);
		expect(adapter).to.exist;
		expect(adapter.config).to.have.property('username');
		expect(adapter.config).to.have.property('password');
	});
});
