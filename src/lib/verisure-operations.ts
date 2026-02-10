/**
 * Verisure GraphQL Operations
 * Based on homebridge-verisure: https://github.com/ptz0n/homebridge-verisure
 */

/**
 * GraphQL operation type
 */
interface GraphQLOperation {
	operationName: string;
	variables?: Record<string, any>;
	query: string;
}

export const overviewOperation: GraphQLOperation = {
	operationName: 'Overview',
	query: `query Overview($giid: String!) {
    installation(giid: $giid) {
      alias
      locale

      climates {
        device {
          deviceLabel
          area
          gui {
            label
            __typename
          }
          __typename
        }
        humidityEnabled
        humidityTimestamp
        humidityValue
        temperatureTimestamp
        temperatureValue
        thresholds {
          aboveMaxAlert
          belowMinAlert
          sensorType
          __typename
        }
        __typename
      }

      armState {
        type
        statusType
        date
        name
        changedVia
        __typename
      }

      doorWindows {
        device {
          deviceLabel
          area
          gui {
            support
            label
            __typename
          }
          __typename
        }
        type
        state
        wired
        reportTime
        __typename
      }

      smartplugs {
        device {
          deviceLabel
          area
          gui {
            support
            label
            __typename
          }
          __typename
        }
        currentState
        icon
        isHazardous
        __typename
      }

      doorlocks {
        device {
          area
          deviceLabel
          __typename
        }
        currentLockState
        __typename
      }

      __typename
    }
  }`,
};

export const armAwayOperation = (code: string): GraphQLOperation => ({
	operationName: 'armAway',
	variables: { code },
	query: `mutation armAway($giid: String!, $code: String!) {
    transactionId: armStateArmAway(giid: $giid, code: $code)
  }`,
});

export const armHomeOperation = (code: string): GraphQLOperation => ({
	operationName: 'armHome',
	variables: { code },
	query: `mutation armHome($giid: String!, $code: String!) {
    transactionId: armStateArmHome(giid: $giid, code: $code)
  }`,
});

export const disarmOperation = (code: string): GraphQLOperation => ({
	operationName: 'disarm',
	variables: { code },
	query: `mutation disarm($giid: String!, $code: String!) {
    transactionId: armStateDisarm(giid: $giid, code: $code)
  }`,
});

export const pollArmStateOperation = (transactionId: string, futureState: string): GraphQLOperation => ({
	operationName: 'pollArmState',
	variables: {
		transactionId,
		futureState,
	},
	query: `query pollArmState($giid: String!, $transactionId: String, $futureState: ArmStateStatusTypes!) {
    installation(giid: $giid) {
      pollResult: armStateChangePollResult(transactionId: $transactionId, futureState: $futureState) {
        result
        createTime
        __typename
      }
      __typename
    }
  }`,
});

export const smartPlugStateOperation = (deviceLabel: string, state: boolean): GraphQLOperation => ({
	operationName: 'smartPlugState',
	variables: {
		deviceLabel,
		state,
	},
	query: `mutation smartPlugState($giid: String!, $deviceLabel: String!, $state: Boolean!) {
    SmartPlugSetState(giid: $giid, input: [{deviceLabel: $deviceLabel, state: $state}])
  }`,
});

export const doorLockOperation = (deviceLabel: string, code: string): GraphQLOperation => ({
	operationName: 'DoorLock',
	variables: {
		deviceLabel,
		input: { code },
	},
	query: `mutation DoorLock($giid: String!, $deviceLabel: String!, $input: LockDoorInput!) {
    transactionId: DoorLock(giid: $giid, deviceLabel: $deviceLabel, input: $input)
  }`,
});

export const doorUnlockOperation = (deviceLabel: string, code: string): GraphQLOperation => ({
	operationName: 'DoorUnlock',
	variables: {
		deviceLabel,
		input: { code },
	},
	query: `mutation DoorUnlock($giid: String!, $deviceLabel: String!, $input: LockDoorInput!) {
    transactionId: DoorUnlock(giid: $giid, deviceLabel: $deviceLabel, input: $input)
  }`,
});

export const pollLockStateOperation = (
	transactionId: string,
	deviceLabel: string,
	futureState: string,
): GraphQLOperation => ({
	operationName: 'pollLockState',
	variables: {
		transactionId,
		deviceLabel,
		futureState,
	},
	query: `query pollLockState($giid: String!, $transactionId: String, $deviceLabel: String!, $futureState: DoorLockState!) {
    installation(giid: $giid) {
      pollResult: doorLockStateChangePollResult(transactionId: $transactionId, deviceLabel: $deviceLabel, futureState: $futureState) {
        result
        createTime
        __typename
      }
      __typename
    }
  }`,
});

export const doorLockConfigOperation = (deviceLabel: string): GraphQLOperation => ({
	operationName: 'DoorLockConfiguration',
	variables: {
		deviceLabel,
	},
	query: `query DoorLockConfiguration($giid: String!, $deviceLabel: String!) {
    installation(giid: $giid) {
      smartLocks(filter: {deviceLabels: [$deviceLabel]}) {
        device {
          area
          deviceLabel
          __typename
        }
        configuration {
          ... on YaleLockConfiguration {
            autoLockEnabled
            voiceLevel
            volume
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
  }`,
});

export const doorLockUpdateConfigOperation = (deviceLabel: string, input: any): GraphQLOperation => ({
	operationName: 'DoorLockUpdateConfig',
	variables: {
		deviceLabel,
		input,
	},
	query: `mutation DoorLockUpdateConfig($giid: String!, $deviceLabel: String!, $input: DoorLockUpdateConfigInput!) {
    DoorLockUpdateConfig(giid: $giid, deviceLabel: $deviceLabel, input: $input)
  }`,
});
