# Verisure Client

This directory contains the Verisure API client implementation for the ioBroker.verisure adapter.

## Files

### verisure-client.ts

The main Verisure API client based on [node-verisure](https://github.com/ptz0n/node-verisure) package.

**Classes:**

- `Verisure` - Main API client class for authentication and GraphQL requests
- `VerisureInstallation` - Installation-specific client for managing a single installation
- `GraphqlError` - Custom error class for GraphQL errors

**Features:**

- Authentication with username/password or cookies
- Multi-factor authentication (MFA) support
- GraphQL query execution
- Installation management
- Automatic host switching for high availability
- Cookie refresh handling

### verisure-operations.ts

GraphQL operations for interacting with the Verisure API, based on [homebridge-verisure](https://github.com/ptz0n/homebridge-verisure).

**Available Operations:**

- `overviewOperation` - Get overview of installation
- `armAwayOperation` - Arm alarm in away mode
- `armHomeOperation` - Arm alarm in home mode
- `disarmOperation` - Disarm alarm
- `pollArmStateOperation` - Poll alarm state changes
- `smartPlugStateOperation` - Control smart plug state
- `doorLockOperation` - Lock door
- `doorUnlockOperation` - Unlock door
- `pollLockStateOperation` - Poll door lock state changes
- `doorLockConfigOperation` - Get door lock configuration
- `doorLockUpdateConfigOperation` - Update door lock configuration

## Usage Example

```typescript
import { Verisure } from './verisure-client';
import { overviewOperation } from './verisure-operations';

// Create client
const verisure = new Verisure('email@example.com', 'password');

// Authenticate
await verisure.getToken();

// Get installations
const installations = await verisure.getInstallations();

// Query installation overview
const overview = await installations[0].client(overviewOperation);
```

## Credits

This implementation is based on:

- [node-verisure](https://github.com/ptz0n/node-verisure) by [@ptz0n](https://github.com/ptz0n)
- [homebridge-verisure](https://github.com/ptz0n/homebridge-verisure) by [@ptz0n](https://github.com/ptz0n)

## License

GPL-3.0 (same as the main adapter)
