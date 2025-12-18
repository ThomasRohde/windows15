// Gradient Flow WGSL Shader
// A smooth animated gradient wallpaper

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

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.resolution;
    
    // Create animated gradient
    let t = u.time * 0.3;
    
    // Color oscillation
    let r = 0.5 + 0.5 * sin(uv.x * 3.14159 + t);
    let g = 0.5 + 0.5 * sin(uv.y * 3.14159 + t + 2.094);
    let b = 0.5 + 0.5 * sin((uv.x + uv.y) * 2.0 + t + 4.188);
    
    // Add subtle wave distortion
    let wave = sin(uv.y * 10.0 + t * 2.0) * 0.02;
    let finalR = r + wave;
    let finalG = g - wave * 0.5;
    let finalB = b + wave * 0.3;
    
    // Audio reactivity boost
    let audioBoost = 1.0 + u.audioLevel * u.audioReactive * 0.3;
    
    return vec4f(
        clamp(finalR * audioBoost, 0.0, 1.0),
        clamp(finalG * audioBoost, 0.0, 1.0),
        clamp(finalB * audioBoost, 0.0, 1.0),
        1.0
    );
}
