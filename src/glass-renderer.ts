const VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

// The whole liquid-glass effect in one pass: for each lens pixel take the
// signed distance to the capsule edge, displace the sampling point along the
// surface normal (stronger near the rim), read the track texture three times
// with slightly different offsets (chromatic aberration) and add a rim light.
const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTrackSize;
uniform vec2 uLensSize;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uBezel;
uniform float uStrength;
uniform float uAberration;
uniform vec2 uAxis;
uniform float uCornerBoost;
uniform float uCornerSpread;
uniform vec2 uLight;
uniform float uSpecular;

float sdCapsule(vec2 p) {
  vec2 q = abs(p) - (uLensSize * 0.5 - vec2(uRadius));
  return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - uRadius;
}

vec4 sampleTrack(vec2 posPx) {
  return texture2D(uTex, posPx / uTrackSize);
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 p = (uv - 0.5) * uLensSize;
  float d = sdCapsule(p);
  if (d > 0.5) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float e = 0.75;
  vec2 n = normalize(vec2(
    sdCapsule(p + vec2(e, 0.0)) - sdCapsule(p - vec2(e, 0.0)),
    sdCapsule(p + vec2(0.0, e)) - sdCapsule(p - vec2(0.0, e))
  ));

  float edge = max(-d, 0.0);
  float t = clamp(edge / uBezel, 0.0, 1.0);
  float m = pow(1.0 - t, 2.0) * uStrength;

  vec2 base = uCenter + p;
  // 1 on the diagonal arcs of the capsule, 0 on the flat top/bottom and the
  // vertical sides: the arc gets full-vector, boosted refraction so the content
  // bends along the lens curve, while the flat top/bottom stays calm.
  // uCornerSpread < 1 stretches the zone further along the arc
  float corner = pow(clamp(2.0 * abs(n.x * n.y), 0.0, 1.0), uCornerSpread);
  vec2 axis = vec2(uAxis.x, mix(uAxis.y, 1.0, corner));
  vec2 disp = n * m * mix(1.0, uCornerBoost, corner) * axis;
  vec4 g = sampleTrack(base - disp);
  vec3 col;
  col.r = sampleTrack(base - disp * (1.0 + uAberration)).r;
  col.g = g.g;
  col.b = sampleTrack(base - disp * (1.0 - uAberration)).b;
  float alpha = g.a;

  float rim = smoothstep(2.5, 0.25, edge);
  float spec = pow(abs(dot(n, uLight)), 1.5) * rim * uSpecular;
  col += spec;
  alpha = max(alpha, spec);

  // Antialias the capsule edge
  alpha *= smoothstep(0.5, -1.0, d);

  gl_FragColor = vec4(col * alpha, alpha);
}
`;

/** Construction parameters of {@link GlassRenderer}. All sizes are CSS px. */
export interface GlassRendererParams {
  /** Target canvas; its backing store is resized to the lens size × `quality`. */
  canvas: HTMLCanvasElement;
  /** Visual (post-transform) lens width. */
  lensWidth: number;
  /** Visual (post-transform) lens height. */
  lensHeight: number;
  /** Supersampling factor for the canvas backing store. */
  quality: number;
  /** Width of the track texture space (including its transparent padding). */
  trackWidth: number;
  /** Height of the track texture space (including its transparent padding). */
  trackHeight: number;
  /** See {@link LiquidToggleGlassConfig.bezelWidth}. */
  bezelWidth: number;
  /** See {@link LiquidToggleGlassConfig.strength}. */
  strength: number;
  /** See {@link LiquidToggleGlassConfig.axisStrength}. */
  axisStrength: { x: number; y: number };
  /** See {@link LiquidToggleGlassConfig.cornerBoost}. */
  cornerBoost: number;
  /** See {@link LiquidToggleGlassConfig.cornerSpread}. */
  cornerSpread: number;
  /** See {@link LiquidToggleGlassConfig.aberration}. */
  aberration: number;
  /** See {@link LiquidToggleGlassConfig.specularOpacity}. */
  specularOpacity: number;
  /** See {@link LiquidToggleGlassConfig.lightAngle}. */
  lightAngle: number;
}

/**
 * A single-quad WebGL renderer that draws the refracted view of the track
 * texture for the lens. One `render()` call per animation frame; the only
 * per-frame uniform is the lens center, so moving the thumb is nearly free.
 */
export class GlassRenderer {
  /** False when WebGL is unavailable or the shaders failed to compile. */
  readonly ok: boolean = false;

  private gl: WebGLRenderingContext | null = null;

  private texture: WebGLTexture | null = null;

  private program: WebGLProgram | null = null;

  private uCenter: WebGLUniformLocation | null = null;

  constructor(params: GlassRendererParams) {
    const { canvas, lensWidth, lensHeight, quality } = params;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!gl) return;

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) return;

    canvas.width = Math.max(1, Math.round(lensWidth * quality));
    canvas.height = Math.max(1, Math.round(lensHeight * quality));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const u = (name: string): WebGLUniformLocation | null => gl.getUniformLocation(program, name);
    gl.uniform1i(u("uTex"), 0);
    gl.uniform2f(u("uTrackSize"), params.trackWidth, params.trackHeight);
    gl.uniform2f(u("uLensSize"), lensWidth, lensHeight);
    gl.uniform1f(u("uRadius"), lensHeight / 2);
    gl.uniform1f(u("uBezel"), params.bezelWidth);
    gl.uniform1f(u("uStrength"), params.strength);
    gl.uniform1f(u("uAberration"), params.aberration);
    gl.uniform2f(u("uAxis"), params.axisStrength.x, params.axisStrength.y);
    gl.uniform1f(u("uCornerBoost"), params.cornerBoost);
    gl.uniform1f(u("uCornerSpread"), params.cornerSpread);
    gl.uniform2f(u("uLight"), Math.cos(params.lightAngle), Math.sin(params.lightAngle));
    gl.uniform1f(u("uSpecular"), params.specularOpacity);

    gl.clearColor(0, 0, 0, 0);

    this.gl = gl;
    this.program = program;
    this.texture = texture;
    this.uCenter = u("uCenter");
    this.ok = true;
  }

  /** Uploads the (re)drawn track texture; `source` pixels map onto `trackWidth` × `trackHeight` CSS px. */
  uploadTexture(source: TexImageSource): void {
    const { gl } = this;
    if (!gl) return;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  /** Draws the lens for the given lens center (in track texture CSS px). */
  render(centerX: number, centerY: number): void {
    const { gl } = this;
    if (!gl) return;
    gl.uniform2f(this.uCenter, centerX, centerY);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Releases the GL resources. The renderer is unusable afterwards. */
  dispose(): void {
    const { gl } = this;
    if (!gl) return;
    gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
    this.gl = null;
  }
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram | null {
  const compile = (type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("liquid-toggle shader error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("liquid-toggle program link error:", gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}
