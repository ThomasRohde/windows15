#version 300 es
precision highp float;

// Gradient Flow GLSL Shader
// A smooth animated gradient wallpaper (WebGL2 fallback)

uniform float u_time;
uniform float u_deltaTime;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_intensity;
uniform float u_audioReactive;
uniform vec4 u_audioFreq;
uniform float u_audioLevel;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    
    // Create animated gradient
    float t = u_time * 0.3;
    
    // Color oscillation
    float r = 0.5 + 0.5 * sin(uv.x * 3.14159 + t);
    float g = 0.5 + 0.5 * sin(uv.y * 3.14159 + t + 2.094);
    float b = 0.5 + 0.5 * sin((uv.x + uv.y) * 2.0 + t + 4.188);
    
    // Add subtle wave distortion
    float wave = sin(uv.y * 10.0 + t * 2.0) * 0.02;
    float finalR = r + wave;
    float finalG = g - wave * 0.5;
    float finalB = b + wave * 0.3;
    
    // Audio reactivity boost
    float audioBoost = 1.0 + u_audioLevel * u_audioReactive * 0.3;
    
    fragColor = vec4(
        clamp(finalR * audioBoost, 0.0, 1.0),
        clamp(finalG * audioBoost, 0.0, 1.0),
        clamp(finalB * audioBoost, 0.0, 1.0),
        1.0
    );
}
