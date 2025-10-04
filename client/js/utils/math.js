// Math Utilities Module
// Extracted from shooter.html as part of Phase 1 refactoring

/**
 * Calculate distance between two points using Pythagorean theorem
 * @param {number} x1 - First point x coordinate
 * @param {number} y1 - First point y coordinate
 * @param {number} x2 - Second point x coordinate
 * @param {number} y2 - Second point y coordinate
 * @returns {number} Distance between the two points
 */
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two points in radians
 * @param {number} x1 - First point x coordinate
 * @param {number} y1 - First point y coordinate
 * @param {number} x2 - Second point x coordinate
 * @param {number} y2 - Second point y coordinate
 * @returns {number} Angle in radians
 */
export function angleBetween(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.atan2(dy, dx);
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Generate random number between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
export function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * Generate random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
export function randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Normalize a vector (make it unit length)
 * @param {number} x - X component
 * @param {number} y - Y component
 * @returns {{x: number, y: number}} Normalized vector
 */
export function normalize(x, y) {
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) return { x: 0, y: 0 };
    return {
        x: x / length,
        y: y / length
    };
}

/**
 * Calculate vector magnitude/length
 * @param {number} x - X component
 * @param {number} y - Y component
 * @returns {number} Vector length
 */
export function magnitude(x, y) {
    return Math.sqrt(x * x + y * y);
}

/**
 * Check if a point is inside a rectangle
 * @param {number} px - Point x coordinate
 * @param {number} py - Point y coordinate
 * @param {number} rx - Rectangle x coordinate
 * @param {number} ry - Rectangle y coordinate
 * @param {number} rw - Rectangle width
 * @param {number} rh - Rectangle height
 * @returns {boolean} True if point is inside rectangle
 */
export function pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Check if two rectangles overlap
 * @param {number} x1 - First rectangle x
 * @param {number} y1 - First rectangle y
 * @param {number} w1 - First rectangle width
 * @param {number} h1 - First rectangle height
 * @param {number} x2 - Second rectangle x
 * @param {number} y2 - Second rectangle y
 * @param {number} w2 - Second rectangle width
 * @param {number} h2 - Second rectangle height
 * @returns {boolean} True if rectangles overlap
 */
export function rectOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

/**
 * Check if a circle overlaps with a rectangle
 * @param {number} cx - Circle center x
 * @param {number} cy - Circle center y
 * @param {number} cr - Circle radius
 * @param {number} rx - Rectangle x
 * @param {number} ry - Rectangle y
 * @param {number} rw - Rectangle width
 * @param {number} rh - Rectangle height
 * @returns {boolean} True if circle and rectangle overlap
 */
export function circleRectOverlap(cx, cy, cr, rx, ry, rw, rh) {
    // Find the closest point on the rectangle to the circle
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);

    // Calculate distance from circle center to this closest point
    const distX = cx - closestX;
    const distY = cy - closestY;
    const distSquared = distX * distX + distY * distY;

    // Circle and rectangle overlap if distance is less than radius
    return distSquared < cr * cr;
}

/**
 * Check if two circles overlap
 * @param {number} x1 - First circle center x
 * @param {number} y1 - First circle center y
 * @param {number} r1 - First circle radius
 * @param {number} x2 - Second circle center x
 * @param {number} y2 - Second circle center y
 * @param {number} r2 - Second circle radius
 * @returns {boolean} True if circles overlap
 */
export function circleOverlap(x1, y1, r1, x2, y2, r2) {
    const dist = distance(x1, y1, x2, y2);
    return dist < r1 + r2;
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
export function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
export function toDegrees(radians) {
    return radians * (180 / Math.PI);
}
