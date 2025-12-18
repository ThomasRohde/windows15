#version 300 es
precision highp float;

// Particle Field GLSL Shader
// Floating particles with depth effect (WebGL2 fallback)

uniform float u_time;
uniform float u_deltaTime;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_intensity;
uniform float u_audioReactive;
uniform vec4 u_audioFreq;
uniform float u_audioLevel;

out vec4 fragColor;

// Hash function for pseudo-random
float hash(vec2 p) {
    float h = dot(p, vec2(127.1, 311.7));
    return fract(sin(h) * 43758.5453);
}

// Smooth noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;
    
    // Background gradient
    vec3 color = mix(
        vec3(0.02, 0.02, 0.08),
        vec3(0.08, 0.05, 0.15),
        uv.y
    );
    
    // Multiple particle layers
    for (int layer = 0; layer < 4; layer++) {
        float depth = float(layer + 1) * 0.25;
        float speed = depth * 0.5;
        float size = (1.0 - depth * 0.5) * 3.0;
        
        // Layer offset with parallax
        vec2 offset = vec2(
            u_time * speed * 0.3,
            u_time * speed * 0.1
        );
        
        // Grid for particles
        float gridSize = 8.0 + float(layer) * 4.0;
        vec2 grid = (uv * vec2(aspect, 1.0) * gridSize) + offset;
        vec2 cellId = floor(grid);
        vec2 cellUv = fract(grid) - 0.5;
        
        // Random position within cell
        float rnd = hash(cellId);
        vec2 particlePos = (vec2(rnd, hash(cellId + vec2(1.0, 0.0))) - 0.5) * 0.6;
        
        // Distance to particle
        float dist = length(cellUv - particlePos);
        
        // Particle glow
        float glow = smoothstep(size / gridSize, 0.0, dist);
        float pulse = 0.7 + 0.3 * sin(u_time * 2.0 + rnd * 6.28);
        
        // Audio reactivity
        float audioPulse = 1.0 + u_audioLevel * u_audioReactive * (0.5 + rnd * 0.5);
        
        // Particle color based on depth
        vec3 particleColor = mix(
            vec3(0.3, 0.5, 1.0),
            vec3(0.8, 0.4, 1.0),
            rnd
        ) * depth;
        
        color += particleColor * glow * pulse * audioPulse * 0.5;
    }
    
    fragColor = vec4(color, 1.0);
}
