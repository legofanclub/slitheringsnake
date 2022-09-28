/**
 * Side length of square world.
 */
export const WORLD_SIZE = 7200;

/**
 * Dimension of square tile used in WorldGrid.
 * TileSize must be a factor of WorldSize.
 * This cannot be set to <800 without changing either: the size of canvas on the frontend
 * or WorldGrid.getNearbyTiles().
 */
export const TILE_SIZE = 800;

export const CRUMB_RADIUS = 5;

export const NUMBER_OF_CRUMBS = 1500;

export const STARTING_SNAKE_RADIUS = 10;

/**
 * probability of each snake segment dropping a crumb on death
 */
export const CRUMBS_ON_DEATH = 0.3; // 