import { sum } from "lodash-es";
import { KrGl, KrGlBuffer, TYPECONVERT } from "./lib";
import { Matrix4 } from "@math.gl/core";

// https://github.com/scriptfoundry/WebGL2-Videos-Materials/blob/main/03.Attributes1.js
const canvas = document.createElement("canvas");
canvas.width = 500;
canvas.height = 500;
document.body.append(canvas);

const kgl = KrGl.create({
  canvas,
  vertext_shader: /*glsl*/ `#version 300 es
    #pragma vscode_glsllint_stage: vert
    layout(location = 0) in vec2 aPosition;
    layout(location = 1) in vec3 aColor;
    uniform mat4 uMvp;
    out vec3 vColor;
    void main() {
      vColor = aColor;
      gl_Position = uMvp * vec4(aPosition, 0.0, 1.0);
    }`,
  fragment_shader: /*glsl*/ `#version 300 es
    #pragma vscode_glsllint_stage: frag
    precision mediump float;
    in vec3 vColor;
    out vec4 fragColor;
    void main() {
      fragColor = vec4(vColor, 1.0);
    }`,
});

const gl = kgl.gl;

const { sin, cos, PI } = Math
const TWOPI = 2 * PI
const amp = 0.7;
// prettier-ignore
const vertecies = new Float32Array([
  0.00000,0.00000,
  sin(TWOPI * 0 / 5) * amp, cos(TWOPI * 0 / 5) * amp,
  sin(TWOPI * 1 / 5) * amp, cos(TWOPI * 1 / 5) * amp,
  sin(TWOPI * 2 / 5) * amp, cos(TWOPI * 2 / 5) * amp,
  sin(TWOPI * 3 / 5) * amp, cos(TWOPI * 3 / 5) * amp,
  sin(TWOPI * 4 / 5) * amp, cos(TWOPI * 4 / 5) * amp,
  sin(TWOPI * 5 / 5) * amp, cos(TWOPI * 5 / 5) * amp,
  
])

// prettier-ignore
const indices = new Uint8Array( [
  0,1,2,
  0,2,3,
  0,3,4,
  0,4,5,
  0,5,1,
]);

const apos = kgl.attribute_location("aPosition", "vec2");
const acolor = kgl.attribute_location("aColor", "vec3");
const umvp = kgl.uniform_location("uMvp", "mat4");

// set default value
// apos.disable_attr_array().set_attr_data_fallback({ data: [0, 0] });
acolor.disable_attr_array().set_attr_data_fallback({ data: [1, 0, 0] });
// set vertex array


KrGlBuffer.create("ARRAY_BUFFER")
  .data(vertecies)
  .bind(() => {
    apos
      .enable_attr_array()
      .set_attr_to_active_buffer();
  });

KrGlBuffer.create("ELEMENT_ARRAY_BUFFER")
  .data(indices)
  .bind(() => {
    
  });

requestAnimationFrame(function f(t) {
  umvp.set_uniform_data({
    data: [false, Matrix4.IDENTITY.clone().rotateZ(t / 500)
  ],
  });

  gl.clearColor(0.72, 0.83, 0.93, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  acolor.set_attr_data_fallback({ data: [1, 0, 0] });
  gl.drawElements(gl.TRIANGLES, 15, gl.UNSIGNED_BYTE, 0)

  acolor.set_attr_data_fallback({ data: [1, 1, 0] });
  gl.drawElements(gl.LINE_STRIP, 15, gl.UNSIGNED_BYTE, 0)
  
  requestAnimationFrame(f);
});
