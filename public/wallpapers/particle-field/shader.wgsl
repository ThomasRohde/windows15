// Particle Field WGSL Shader
// Floating particles with depth effect

struct Uniforms {
    time: f32,
    deltaTime: f32,
    resolution: vec2f,
    mouse: vec2f,
    intensity: f32,
    audioReactive: f32,
    audioFreq: vec4f,
    audioLevel: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

// Hash function for pseudo-random
fn hash(p: vec2f) -> f32 {
    let h = dot(p, vec2f(127.1, 311.7));
    return fract(sin(h) * 43758.5453);
}

// Smooth noise
fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    
    return mix(
        mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
        mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
        u.y
    );
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.resolution;
    let aspect = u.resolution.x / u.resolution.y;
    
    // Background gradient
    var color = mix(
        vec3f(0.02, 0.02, 0.08),
        vec3f(0.08, 0.05, 0.15),
        uv.y
    );
    
    // Multiple particle layers
    for (var layer = 0; layer < 4; layer++) {
        let depth = f32(layer + 1) * 0.25;
        let speed = depth * 0.5;
        let size = (1.0 - depth * 0.5) * 3.0;
        
        // Layer offset with parallax
        let offset = vec2f(
            u.time * speed * 0.3,
            u.time * speed * 0.1
        );
        
        // Grid for particles
        let gridSize = 8.0 + f32(layer) * 4.0;
        let grid = (uv * vec2f(aspect, 1.0) * gridSize) + offset;
        let cellId = floor(grid);
        let cellUv = fract(grid) - 0.5;
        
        // Random position within cell
        let rnd = hash(cellId);
        let particlePos = (vec2f(rnd, hash(cellId + vec2f(1.0, 0.0))) - 0.5) * 0.6;
        
        // Distance to particle
        let dist = length(cellUv - particlePos);
        
        // Particle glow
        let glow = smoothstep(size / gridSize, 0.0, dist);
        let pulse = 0.7 + 0.3 * sin(u.time * 2.0 + rnd * 6.28);
        
        // Audio reactivity
        let audioPulse = 1.0 + u.audioLevel * u.audioReactive * (0.5 + rnd * 0.5);
        
        // Particle color based on depth
        let particleColor = mix(
            vec3f(0.3, 0.5, 1.0),
            vec3f(0.8, 0.4, 1.0),
            rnd
        ) * depth;
        
        color += particleColor * glow * pulse * audioPulse * 0.5;
    }
    
    return vec4f(color, 1.0);
}
