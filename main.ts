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

const bufferData = new Float32Array(
  [
    [0, 1, 100, 1, 0, 0],
    [-1, -1, 32, 0, 1, 0],
    [1, -1, 50, 0, 0, 1],
  ].flat()
);

const apos = kgl.attribute_location("aPosition", "vec2");
const apoint = kgl.attribute_location("aPointSize", "float");
const acolor = kgl.attribute_location("aColor", "vec3");

apos.enable();
apoint.enable();
acolor.enable();

new KrGlBuffer("ARRAY_BUFFER")
  .bind()
  .data(bufferData)
  .bind(() => {
    apos.set_attrib({ strip: 6 * 4, offset: 0 });
    apoint.set_attrib({ strip: 6 * 4, offset: 2 * 4 });
    acolor.set_attrib({ strip: 6 * 4, offset: 3 * 4 });
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
