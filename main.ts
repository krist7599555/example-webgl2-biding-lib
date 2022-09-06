import { sum } from "lodash-es";
import { KrGl, KrGlBuffer, TYPECONVERT, webgl_bind } from "./lib";
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
    layout(location = 2) in vec3 aTranslate;
    uniform mat4 uMvp;
    out vec3 vColor;
    void main() {
      vColor = aColor;
      gl_Position = vec4(aTranslate, 0.0) + (uMvp * vec4(aPosition, 0.0, 1.0));
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

const { sin, cos, PI } = Math;
const TWOPI = 2 * PI;
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

const vertecies_buffer = KrGlBuffer.create("ARRAY_BUFFER").data(vertecies);
const vao = kgl.create_vao_state();

webgl_bind({ vao: vao, array_buffer: vertecies_buffer }, () => {
  kgl
    .attribute_location("aPosition", "vec2")
    .enable_attr_array() // ~> vao[aPosition].enable()
    .set_attr_to_active_array_buffer(); // vao[aPosition].attribute.set($current.array_buffer)
});

const webgl_index = KrGlBuffer.create("ELEMENT_ARRAY_BUFFER").data(
  // prettier-ignore
  new Uint8Array( [
    0,1,2,
    0,2,3,
    0,3,4,
    0,4,5,
    0,5,1,
  ])
);

const transform_count = 3;
const transform = new KrGlBuffer("ARRAY_BUFFER").data(
  // prettier-ignore
  new Float32Array([
    // [translate vec3], [color vec3]
    0.5, 0.0, 0.0, 0, 1, 0,
    0.0, 0.2, 0.0, 0, 0, 1,
    -0.3, -0.3, 0.0, 1, 1, 0,
  ])
);

requestAnimationFrame(function f(t) {
  kgl.uniform_location("uMvp", "mat4").set_uniform_data({
    data: [false, Matrix4.IDENTITY.clone().rotateZ(t / 500)],
  });

  gl.clearColor(0.72, 0.83, 0.93, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  transform._data[0] = Math.sin(t / 1000);
  transform._data[5] = Math.sin(t / 1000);
  transform._data[7] = Math.sin(t / 1000);
  transform.update();

  webgl_bind(
    { vao: vao, array_buffer: transform, element_array_buffer: webgl_index },
    () => {
      const FLOAT_SIZE = 4;
      kgl
        .attribute_location("aTranslate", "vec3")
        .enable_attr_array()
        .set_attr_to_active_array_buffer({
          strip: FLOAT_SIZE * 6,
          offset: 0 * 0,
        })
        .vertex_attr_divisor();

      kgl
        .attribute_location("aColor", "vec3")
        .enable_attr_array()
        .set_attr_to_active_array_buffer({
          strip: FLOAT_SIZE * 6,
          offset: FLOAT_SIZE * 3,
        })
        .vertex_attr_divisor();

      gl.drawElementsInstanced(
        gl.TRIANGLES,
        15,
        gl.UNSIGNED_BYTE,
        0,
        transform_count
      );

      // acolor.set_attr_data_fallback({ data: [1, 1, 0] });
      // gl.drawElements(gl.LINE_STRIP, 15, gl.UNSIGNED_BYTE, 0);
    }
  );

  requestAnimationFrame(f);
});
