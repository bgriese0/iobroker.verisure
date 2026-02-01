/**
 * This is a dummy TypeScript test file using chai and mocha
 *
 * It's automatically excluded from npm and its build output is excluded from both git and npm.
 * It is advised to test all your modules with accompanying *.test.ts-files
 */

import { expect } from 'chai';
import ioPackage from '../io-package.json';

describe('Verisure adapter config', () => {
	it('native config contains credentials fields', () => {
		expect(ioPackage.native).to.have.property('username');
		expect(ioPackage.native).to.have.property('password');
	});
});
