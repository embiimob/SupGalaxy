/**
 * SupGalaxy Configuration Module
 * Centralized configuration for the SupGalaxy application
 * @module config
 */

// Version
const VERSION = 'SupGalaxy v0.5.7-beta';

// World Generation Constants
const CHUNK_SIZE = 16;
const MAX_HEIGHT = 256;
const SEA_LEVEL = 16;
const MAP_SIZE = 16384;
const CHUNKS_PER_SIDE = Math.floor(MAP_SIZE / CHUNK_SIZE);

// Block Types
const BLOCK_AIR = 0;

// Networking & API
const API_CALLS_PER_SECOND = 3;
const API_BASE_URL = 'https://p2fk.io';
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
const MAX_PEERS = 10;

// Timing Constants
const POLL_INTERVAL = 30000; // 30 seconds
const PENDING_PERIOD = 2592e6; // 30 days in milliseconds
const OWNERSHIP_EXPIRY = 31536e6; // 365 days in milliseconds
const IPFS_MATURITY_PERIOD = 30 * 24 * 60 * 60 * 1000; // 30 days
const IPFS_MAX_OWNERSHIP_PERIOD = 365 * 24 * 60 * 60 * 1000; // 365 days

// Chunk Loading
const POLL_RADIUS = 2;
const INITIAL_LOAD_RADIUS = 9;
const LOAD_RADIUS = 3;

// World Management
const MASTER_WORLD_KEY = 'MCWorlds';

// Feature Flags
const FEATURE_FLAGS = {
  debugMode: false,
  enableBenchmarking: false,
  enableVerboseLogging: false,
};

// Export configuration
const CONFIG = {
  VERSION,
  CHUNK_SIZE,
  MAX_HEIGHT,
  SEA_LEVEL,
  MAP_SIZE,
  CHUNKS_PER_SIDE,
  BLOCK_AIR,
  API_CALLS_PER_SECOND,
  API_BASE_URL,
  IPFS_GATEWAY,
  MAX_PEERS,
  POLL_INTERVAL,
  PENDING_PERIOD,
  OWNERSHIP_EXPIRY,
  IPFS_MATURITY_PERIOD,
  IPFS_MAX_OWNERSHIP_PERIOD,
  POLL_RADIUS,
  INITIAL_LOAD_RADIUS,
  LOAD_RADIUS,
  MASTER_WORLD_KEY,
  FEATURE_FLAGS,
};

// Make available globally (for browser compatibility)
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
