/**
 * ParticleSystem
 * Handles particle effects and lifecycle management
 *
 * Responsibilities:
 * - Particle creation
 * - Particle updates (physics)
 * - Particle lifecycle management
 * - Particle cleanup
 */

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    /**
     * Create a new particle
     * @param {Object} config - Particle configuration
     * @param {number} config.x - X position
     * @param {number} config.y - Y position
     * @param {number} config.vx - X velocity
     * @param {number} config.vy - Y velocity
     * @param {number} config.size - Particle size
     * @param {number} config.life - Particle life (0-1)
     * @param {string} config.color - Particle color
     * @param {boolean} [config.isVoxel] - Whether particle is voxel-style
     */
    createParticle(config) {
        this.particles.push({
            x: config.x,
            y: config.y,
            vx: config.vx,
            vy: config.vy,
            size: config.size,
            life: config.life,
            color: config.color,
            isVoxel: config.isVoxel || false
        });
    }

    /**
     * Create multiple particles at once
     */
    createParticles(configs) {
        configs.forEach(config => this.createParticle(config));
    }

    /**
     * Create explosion particles
     */
    createExplosionParticles(x, y, count = 30, colors = ['#ff6600', '#ffaa00']) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            this.createParticle({
                x: x,
                y: y,
                vx: Math.cos(angle) * (8 + Math.random() * 8),
                vy: Math.sin(angle) * (8 + Math.random() * 8),
                size: 5 + Math.random() * 8,
                life: 1.0,
                color: colors[i % colors.length]
            });
        }
    }

    /**
     * Create death particles for a player
     */
    createDeathParticles(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 3 + Math.random() * 3;
            this.createParticle({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color || '#4ecdc4',
                life: 1.0,
                size: 8 + Math.random() * 4
            });
        }
    }

    /**
     * Create debris particles (voxel-style)
     */
    createDebrisParticles(x, y, count = 8) {
        for (let i = 0; i < count; i++) {
            this.createParticle({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                size: 4 + Math.random() * 4,
                life: 1.0,
                color: '#00ffff',
                isVoxel: true
            });
        }
    }

    /**
     * Update all particles
     * Updates position, applies friction, reduces life
     * Automatically removes dead particles
     */
    update() {
        this.particles = this.particles.filter(particle => {
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Apply friction
            particle.vx *= 0.95;
            particle.vy *= 0.95;

            // Reduce life
            particle.life -= 0.02;

            // Shrink size
            particle.size *= 0.97;

            // Keep particle if still alive
            return particle.life > 0;
        });
    }

    /**
     * Get all active particles
     */
    getParticles() {
        return this.particles;
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }

    /**
     * Get particle count
     */
    getCount() {
        return this.particles.length;
    }
}
