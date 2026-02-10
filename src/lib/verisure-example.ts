/**
 * Example usage of the Verisure client
 * This file demonstrates how to use the verisure-client in the ioBroker adapter
 */

import { Verisure } from './verisure-client';
import { overviewOperation, armAwayOperation } from './verisure-operations';

/**
 * Example: Basic authentication and getting installations
 */
async function basicExample() {
	// Create client with email and password
	const verisure = new Verisure('your@email.com', 'your-password');

	// Authenticate and get token (cookies)
	const cookies = await verisure.getToken();
	console.log('Authenticated with cookies:', cookies);

	// Get all installations
	const installations = await verisure.getInstallations();
	console.log(`Found ${installations.length} installation(s)`);

	// Get first installation
	const [installation] = installations;
	console.log('Installation:', installation.config);
}

/**
 * Example: Using cookies for authentication (MFA enabled accounts)
 */
async function cookieExample() {
	// Create client with email and pre-obtained cookies
	const verisure = new Verisure('your@email.com', '', [
		'vid=myTopSecretToken',
		'vs-access=myAccessToken',
		'vs-refresh=myRefreshToken',
	]);

	// Get installations (no need to call getToken with cookies)
	const installations = await verisure.getInstallations();
	console.log(`Found ${installations.length} installation(s)`);
}

/**
 * Example: Querying installation overview
 */
async function overviewExample() {
	const verisure = new Verisure('your@email.com', 'your-password');
	await verisure.getToken();

	const installations = await verisure.getInstallations();
	const [installation] = installations;

	// Get overview of the installation
	const { installation: overview } = await installation.client(overviewOperation);

	console.log('Alarm state:', overview.armState);
	console.log('Climate sensors:', overview.climates);
	console.log('Door/Window sensors:', overview.doorWindows);
	console.log('Smart plugs:', overview.smartplugs);
	console.log('Door locks:', overview.doorlocks);
}

/**
 * Example: Controlling the alarm
 */
async function alarmControlExample() {
	const verisure = new Verisure('your@email.com', 'your-password');
	await verisure.getToken();

	const installations = await verisure.getInstallations();
	const [installation] = installations;

	// Arm the alarm in away mode
	const alarmCode = '1234'; // Your alarm code
	const { transactionId } = await installation.client(armAwayOperation(alarmCode));

	console.log('Alarm arming initiated, transaction ID:', transactionId);
}

/**
 * Example: Multi-factor authentication
 */
async function mfaExample() {
	const verisure = new Verisure('your@email.com', 'your-password');

	// First call to getToken initiates MFA
	await verisure.getToken();
	console.log('MFA code sent to your device');

	// After receiving the code, call getToken again with the code
	const mfaCode = '123456'; // The code you received
	const cookies = await verisure.getToken(mfaCode);

	console.log('Authenticated with MFA. Save these cookies for future use:');
	console.log(cookies);
}

// Note: These are example functions. To use them, uncomment and call:
// basicExample().catch(console.error);
// cookieExample().catch(console.error);
// overviewExample().catch(console.error);
// alarmControlExample().catch(console.error);
// mfaExample().catch(console.error);
