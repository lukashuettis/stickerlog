// Provide an in-memory IndexedDB so Dexie works under Node during tests.
import 'fake-indexeddb/auto'

// Tame Dexie's noisy "Database closed" warnings between tests.
import Dexie from 'dexie'
Dexie.debug = false
