import { operationRegistry } from './registry';
import {
  uppercaseOperation,
  lowercaseOperation,
  trimWhitespaceOperation,
} from './local';
import {
  modifySelectionOperation,
  reorderListOperation,
  summarizeOperation,
} from './backend';

// Register all local operations
operationRegistry.register(uppercaseOperation);
operationRegistry.register(lowercaseOperation);
operationRegistry.register(trimWhitespaceOperation);

// Register all backend operations
operationRegistry.register(modifySelectionOperation);
operationRegistry.register(reorderListOperation);
operationRegistry.register(summarizeOperation);

export { operationRegistry };
export * from './registry';
