import { sum } from "lodash-es";
import { KrGl, KrGlBuffer, KrGlLocation } from "./lib";
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

const apos = kgl.attribute_location("aPosition", "vec2");
const acolor = kgl.attribute_location("aColor", "vec3");
const umvp = kgl.uniform_location("uMvp", "mat4");

// set default value
apos.disable_attr_array().set_attr_data({ data: [0, 0] });
acolor.disable_attr_array().set_attr_data({ data: [1, 0, 1] });
// set vertex array

const count = 3;

KrGlBuffer.create("ARRAY_BUFFER")
  .data(
    new Float32Array(
      [
        [0, 1, 1, 1, 0],
        [-1, -1, 0, 1, 1],
        [1, -1, 1, 0, 1],
      ].flat()
    )
  )
  .bind(() => {
    const sz = [
      apos.element_type.size_in_byte,
      acolor.element_type.size_in_byte,
    ];
    apos
      .enable_attr_array()
      .set_attr_array({ strip: sum(sz), offset: sum(sz.slice(0, 0)) });
    acolor
      .enable_attr_array()
      .set_attr_array({ strip: sum(sz), offset: sum(sz.slice(0, 1)) });
  });

requestAnimationFrame(function f(t) {
  umvp.set_uniform_data({
    data: [false, Matrix4.IDENTITY.clone().rotateZ(t / 100)],
  });

  gl.clearColor(0.72, 0.83, 0.93, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, count);
  requestAnimationFrame(f);
});
