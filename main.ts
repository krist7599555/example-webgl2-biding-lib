import { sum } from "lodash-es";
import { KrGl, KrGlBuffer, KrGlLocation } from "./lib";

// https://github.com/scriptfoundry/WebGL2-Videos-Materials/blob/main/03.Attributes1.js
const canvas = document.createElement("canvas");
document.body.append(canvas);

const kgl = KrGl.create({
  canvas,
  vertext_shader: /*glsl*/ `#version 300 es
    #pragma vscode_glsllint_stage: vert
    layout(location = 1) in float aPointSize;
    layout(location = 0) in vec2 aPosition;
    layout(location = 2) in vec3 aColor;
    out vec3 vColor;
    void main() {
      vColor = aColor;
      gl_PointSize = aPointSize;
      gl_Position = vec4(aPosition, 0.0, 1.0);
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
const apoint = kgl.attribute_location("aPointSize", "float");
const acolor = kgl.attribute_location("aColor", "vec3");

// set default value
apos.disable_attr_array().set_attr_data("2f", { data: [0, 0] });
apoint.disable_attr_array().set_attr_data("1f", { data: [50] });
acolor.disable_attr_array().set_attr_data("3f", { data: [1, 0, 1] });

// set vertex array

const count = 3;
const USE_SPERATE_BUFFER = false;

if (USE_SPERATE_BUFFER) {
  KrGlBuffer.create("ARRAY_BUFFER")
    .data(new Float32Array([0, 1, -1, -1, 1, -1]))
    .bind(() => {
      apos.enable_attr_array().set_attr_array({});
    });

  KrGlBuffer.create("ARRAY_BUFFER")
    .data(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]))
    .bind(() => {
      acolor.enable_attr_array().set_attr_array({});
    });

  KrGlBuffer.create("ARRAY_BUFFER")
    .data(new Float32Array([50, 150, 350]))
    .bind(() => {
      apoint.enable_attr_array().set_attr_array({});
    });
} else {
  KrGlBuffer.create("ARRAY_BUFFER")
    .data(
      new Float32Array(
        [
          [0, 1, 150, 1, 1, 0],
          [-1, -1, 50, 0, 1, 1],
          [1, -1, 90, 1, 0, 1],
        ].flat()
      )
    )
    .bind(() => {
      const sz = [
        apos.element_type.size_in_byte,
        apoint.element_type.size_in_byte,
        acolor.element_type.size_in_byte,
      ]
      apos.enable_attr_array().set_attr_array({ strip: sum(sz), offset: sum(sz.slice(0, 0)) });
      apoint.enable_attr_array().set_attr_array({ strip: sum(sz), offset: sum(sz.slice(0, 1)) });
      acolor.enable_attr_array().set_attr_array({ strip: sum(sz), offset: sum(sz.slice(0, 2)) });
    });
}
gl.drawArrays(gl.POINTS, 0, count);
