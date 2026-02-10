"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var verisure_operations_exports = {};
__export(verisure_operations_exports, {
  armAwayOperation: () => armAwayOperation,
  armHomeOperation: () => armHomeOperation,
  disarmOperation: () => disarmOperation,
  doorLockConfigOperation: () => doorLockConfigOperation,
  doorLockOperation: () => doorLockOperation,
  doorLockUpdateConfigOperation: () => doorLockUpdateConfigOperation,
  doorUnlockOperation: () => doorUnlockOperation,
  overviewOperation: () => overviewOperation,
  pollArmStateOperation: () => pollArmStateOperation,
  pollLockStateOperation: () => pollLockStateOperation,
  smartPlugStateOperation: () => smartPlugStateOperation
});
module.exports = __toCommonJS(verisure_operations_exports);
const overviewOperation = {
  operationName: "Overview",
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
  }`
};
const armAwayOperation = (code) => ({
  operationName: "armAway",
  variables: { code },
  query: `mutation armAway($giid: String!, $code: String!) {
    transactionId: armStateArmAway(giid: $giid, code: $code)
  }`
});
const armHomeOperation = (code) => ({
  operationName: "armHome",
  variables: { code },
  query: `mutation armHome($giid: String!, $code: String!) {
    transactionId: armStateArmHome(giid: $giid, code: $code)
  }`
});
const disarmOperation = (code) => ({
  operationName: "disarm",
  variables: { code },
  query: `mutation disarm($giid: String!, $code: String!) {
    transactionId: armStateDisarm(giid: $giid, code: $code)
  }`
});
const pollArmStateOperation = (transactionId, futureState) => ({
  operationName: "pollArmState",
  variables: {
    transactionId,
    futureState
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
  }`
});
const smartPlugStateOperation = (deviceLabel, state) => ({
  operationName: "smartPlugState",
  variables: {
    deviceLabel,
    state
  },
  query: `mutation smartPlugState($giid: String!, $deviceLabel: String!, $state: Boolean!) {
    SmartPlugSetState(giid: $giid, input: [{deviceLabel: $deviceLabel, state: $state}])
  }`
});
const doorLockOperation = (deviceLabel, code) => ({
  operationName: "DoorLock",
  variables: {
    deviceLabel,
    input: { code }
  },
  query: `mutation DoorLock($giid: String!, $deviceLabel: String!, $input: LockDoorInput!) {
    transactionId: DoorLock(giid: $giid, deviceLabel: $deviceLabel, input: $input)
  }`
});
const doorUnlockOperation = (deviceLabel, code) => ({
  operationName: "DoorUnlock",
  variables: {
    deviceLabel,
    input: { code }
  },
  query: `mutation DoorUnlock($giid: String!, $deviceLabel: String!, $input: LockDoorInput!) {
    transactionId: DoorUnlock(giid: $giid, deviceLabel: $deviceLabel, input: $input)
  }`
});
const pollLockStateOperation = (transactionId, deviceLabel, futureState) => ({
  operationName: "pollLockState",
  variables: {
    transactionId,
    deviceLabel,
    futureState
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
  }`
});
const doorLockConfigOperation = (deviceLabel) => ({
  operationName: "DoorLockConfiguration",
  variables: {
    deviceLabel
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
  }`
});
const doorLockUpdateConfigOperation = (deviceLabel, input) => ({
  operationName: "DoorLockUpdateConfig",
  variables: {
    deviceLabel,
    input
  },
  query: `mutation DoorLockUpdateConfig($giid: String!, $deviceLabel: String!, $input: DoorLockUpdateConfigInput!) {
    DoorLockUpdateConfig(giid: $giid, deviceLabel: $deviceLabel, input: $input)
  }`
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  armAwayOperation,
  armHomeOperation,
  disarmOperation,
  doorLockConfigOperation,
  doorLockOperation,
  doorLockUpdateConfigOperation,
  doorUnlockOperation,
  overviewOperation,
  pollArmStateOperation,
  pollLockStateOperation,
  smartPlugStateOperation
});
//# sourceMappingURL=verisure-operations.js.map
