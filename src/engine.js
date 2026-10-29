// Renderer and the PS1-style look: low-res render target, vertex snapping, dithering, grain, distortion.
import * as THREE from 'three';

const LOW_H = 240;

// Vertex snapping for the wobbly PS1 look.
const snap = { value: new THREE.Vector2(160, 120) };

// desat: 0..1, how much colour to drain out (used to make the cheerful asset-pack props look decayed).
export function psx(mat, desat = 0) {
  mat.customProgramCacheKey = () => 'psx' + desat;
  mat.onBeforeCompile = (s) => {
    s.uniforms.uSnap = snap;
    if (desat) {
      s.fragmentShader = s.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), ${desat.toFixed(2)});`
      );
    }
    s.vertexShader = 'uniform vec2 uSnap;\n' + s.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
       vec4 sp = gl_Position; sp.xyz /= sp.w; sp.xy = floor(sp.xy * uSnap) / uSnap; sp.xyz *= sp.w; gl_Position = sp;`
    );
  };
  return mat;
}

export function createEngine() {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  document.body.appendChild(renderer.domElement);

  const lowRes = new THREE.Vector2();
  const target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const post = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: target.texture },
      res: { value: lowRes },
      time: { value: 0 },
      aberration: { value: 0 },
      grain: { value: 0.09 },
      red: { value: 0 },
      fade: { value: 0 },
      phone: { value: 0 },
      tired: { value: 0 },   // out of breath from running
      air: { value: 0 },     // holding your breath: 1 = about to gasp
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 res; uniform float time, aberration, grain, red, fade, phone, tired, air;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float bayer(vec2 p){ p = mod(floor(p), 4.0);
        int i = int(p.x + p.y * 4.0);
        float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
        for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0;
        return 0.0; }
      void main(){
        vec2 c = vUv - 0.5;
        vec2 uv = 0.5 + c * (1.0 + 0.06 * dot(c, c));
        float jitter = aberration * (hash(vec2(floor(time * 30.0), floor(uv.y * 60.0))) - 0.5) * 0.04;
        uv.x += jitter;
        float ab = 0.0015 + aberration * 0.015;
        vec3 col = vec3(texture2D(tDiffuse, uv + vec2(ab, 0.)).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - vec2(ab, 0.)).b);
        // winded: vision swims (a doubled image drifting with each gasp)
        float gasp = 0.5 + 0.5 * sin(time * 7.0);
        col = mix(col, texture2D(tDiffuse, uv + vec2(0.006, 0.002) * tired * gasp).rgb, 0.4 * tired);
        col = pow(max(col, 0.0), vec3(1.0 / 2.2));
        // phone camera: greener night-vision tint and heavier noise
        col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))) * vec3(0.75, 1.15, 0.8) * 1.4, phone);
        vec2 px = floor(uv * res);
        col = floor(col * 24.0 + bayer(px)) / 24.0;
        col += (hash(px + fract(time) * 100.0) - 0.5) * (grain + phone * 0.1);
        col *= 0.93 + 0.07 * sin(uv.y * res.y * 3.14159);
        col *= smoothstep(0.82, 0.18, length(c));
        // winded: the edges close in, pulsing with your breathing
        col *= mix(1.0, 1.0 - smoothstep(0.12, 0.7 - 0.08 * gasp, length(c)), tired * 0.75);
        // holding your breath: the world drains of colour and goes dark and red from the edges as the air runs out
        float beat = 0.5 + 0.5 * sin(time * (6.0 + air * 6.0));
        float squeeze = 1.0 - smoothstep(0.15 - air * 0.1, 0.85 - air * 0.4 - beat * air * 0.06, length(c));
        col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))), air * 0.7);
        col = col * mix(1.0, squeeze, air) + vec3(0.22, 0.0, 0.0) * (1.0 - squeeze) * smoothstep(0.5, 1.0, air);
        col = mix(col, vec3(0.55, 0.0, 0.0), red);
        col *= 1.0 - fade;
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthTest: false,
  });
  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));

  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 80);

  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    lowRes.set(Math.round(LOW_H * camera.aspect), LOW_H);
    target.setSize(lowRes.x, lowRes.y);
  }
  addEventListener('resize', resize);
  resize();

  return {
    renderer,
    camera,
    post,
    // fx: { time, aberration, red, fade, phone }
    render(scene, cam, fx) {
      for (const k in fx) if (post.uniforms[k]) post.uniforms[k].value = fx[k];
      renderer.setRenderTarget(target);
      renderer.render(scene, cam);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
    },
  };
}
