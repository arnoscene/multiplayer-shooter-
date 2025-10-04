// Helper Functions Module
// Extracted from shooter.html as part of Phase 1 refactoring

/**
 * Generate a unique player ID
 * @returns {string} Unique player ID
 */
export function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Generate a unique bullet ID
 * @param {string} playerId - Player ID who fired the bullet
 * @returns {string} Unique bullet ID
 */
export function generateBulletId(playerId) {
    return 'b_' + playerId + '_' + Date.now() + '_' + Math.random();
}

/**
 * Generate a unique explosion ID
 * @returns {string} Unique explosion ID
 */
export function generateExplosionId() {
    return 'explosion_' + Date.now() + '_' + Math.random();
}

/**
 * Format a number to display with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Calculate damage falloff based on distance
 * @param {number} distance - Distance from explosion/impact
 * @param {number} radius - Maximum damage radius
 * @returns {number} Damage multiplier (0-1)
 */
export function calculateFalloff(distance, radius) {
    if (distance >= radius) return 0;
    return 1 - (distance / radius);
}

/**
 * Get random element from array
 * @param {Array} array - Array to pick from
 * @returns {*} Random element
 */
export function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Check if WebSocket is connected
 * @param {WebSocket} ws - WebSocket connection
 * @returns {boolean} True if connected
 */
export function isConnected(ws) {
    return ws && ws.readyState === WebSocket.OPEN;
}

/**
 * Send message through WebSocket if connected
 * @param {WebSocket} ws - WebSocket connection
 * @param {object} data - Data to send
 * @returns {boolean} True if message was sent
 */
export function sendMessage(ws, data) {
    if (isConnected(ws)) {
        ws.send(JSON.stringify(data));
        return true;
    }
    return false;
}

/**
 * Debounce function - limits how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function - ensures function is called at most once per interval
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds between calls
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Deep clone an object (simple implementation)
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if value is between min and max (inclusive)
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if value is in range
 */
export function inRange(value, min, max) {
    return value >= min && value <= max;
}

/**
 * Get readable time string from milliseconds
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string (e.g., "1m 30s")
 */
export function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Create particle effect data
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} color - Particle color
 * @param {number} count - Number of particles
 * @returns {Array} Array of particle objects
 */
export function createParticles(x, y, color, count = 10) {
    const particles = [];
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 3 + Math.random() * 3;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color,
            size: 4 + Math.random() * 4,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.02
        });
    }
    return particles;
}

/**
 * Update particle system (reduce life, apply velocity)
 * @param {Array} particles - Array of particles
 * @returns {Array} Filtered array of living particles
 */
export function updateParticles(particles) {
    return particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.vx *= 0.98; // Air resistance
        p.vy *= 0.98;
        return p.life > 0;
    });
}
