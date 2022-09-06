import { range } from "lodash-es";
import { KrGl, webgl_bind } from "./lib";
import { Matrix4, toRadians } from "@math.gl/core";

const glsl = <T extends string>(source: T) => source;

// https://github.com/scriptfoundry/WebGL2-Videos-Materials/blob/main/03.Attributes1.js
const canvas = document.createElement("canvas");
canvas.width = 700;
canvas.height = 700;
document.body.append(canvas);

const kgl = KrGl.create({
  canvas,
  vertext_shader: glsl(/*glsl*/ `#version 300 es
    #pragma vscode_glsllint_stage: vert
    #pragma glslify: noise = require(glsl-noise/periodic/3d)
    layout(location = 0) in float aX;
    layout(location = 1) in float aY;
    uniform float uTimestamp;
    uniform mat4 uMvp;
    out vec3 vColor;
    void main() {
      vColor = vec3(1.0, 1.0, 1.0);
      gl_PointSize = 10.0;
      vec3 rep = vec3(10.0, 10.0, 10.0);
      float zoom = 2.0;
      float t = uTimestamp * 0.0003;
      float h = noise(vec3(aX * zoom + t, aY * zoom, t), rep);
      gl_Position = uMvp * vec4(aX, aY + (h - 0.5) * 0.2, h * 0.1, 1.0);
    }`),
  fragment_shader: glsl(/*glsl*/ `#version 300 es
    #pragma vscode_glsllint_stage: frag
    precision mediump float;
    in vec3 vColor;
    out vec4 fragColor;
    void main() {
      fragColor = vec4(vColor, 1.0);
    }`),
});

const gl = kgl.gl;

const { sin, cos, PI } = Math;
const TWOPI = 2 * PI;
const amp = 0.7;
// prettier-ignore
const seq_x = range(-1.1, 1.1, 0.03);
const seq_y = range(-1.3, 1.3, 0.05);
const bx = kgl.create_buffer("ARRAY_BUFFER").data(new Float32Array(seq_x));
const by = kgl.create_buffer("ARRAY_BUFFER").data(new Float32Array(seq_y));

const vao = kgl.create_vao_state();

webgl_bind({ vao, array_buffer: bx }, () => {
  kgl
    .attribute_location("aX", "float")
    .enable_attr_array()
    .set_attr_to_active_array_buffer();
});

webgl_bind({ vao, array_buffer: by }, () => {
  kgl
    .attribute_location("aY", "float")
    .enable_attr_array()
    .set_attr_to_active_array_buffer()
    .vertex_attr_divisor(1);
});

requestAnimationFrame(function f(t) {
  const model = new Matrix4().identity();
  const view = new Matrix4().lookAt({
    eye: [0, 0, 2],
    center: [0, 0, 0],
    up: [0, 1, 0],
  });
  const proj = new Matrix4().perspective({
    fovy: toRadians(50),
    aspect: 1.0,
    far: 1000,
    near: 0.0,
  });
  const mvp = new Matrix4()
    .identity()
    .multiplyLeft(model)
    .multiplyLeft(view)
    .multiplyLeft(proj);
  webgl_bind({ vao }, () => {
    kgl.uniform_location("uTimestamp", "float").set_uniform_data({ data: [t] });
    kgl
      .uniform_location("uMvp", "mat4")
      .set_uniform_data({ data: [false, mvp] });
    // kgl.attribute_location("aX", "float").disable_attr_array().set_attr_data_fallback({ data: [0] })
    // kgl.attribute_location("aY", "float").disable_attr_array().set_attr_data_fallback({ data: [0] })
    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // gl.drawArrays(gl.POINTS, 0, seq_x.length)
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, seq_x.length, seq_y.length);
  });
  requestAnimationFrame(f);
});
