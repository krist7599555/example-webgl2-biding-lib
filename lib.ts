import { values } from "lodash-es";
import { TypedArray, ValueOf } from "type-fest";
import { RecordOfVariableTypeFromShaderString } from "./type";

function assert<T>(cond: T, message = "assert error"): asserts cond {
  if (!cond) {
    throw new Error(message);
  }
}

// prettier-ignore
export const TYPECONVERT = {
  "float": { glsl_type: "float", base_type: "FLOAT", element_size: 4, element_count: 1,  size_in_byte: 4,  gl_setter_abbr: "1f",          gl_setter_uniform: "uniform1f",        gl_setter_attr: "vertexAttrib1f"  },
  "vec2":  { glsl_type: "vec2",  base_type: "FLOAT", element_size: 4, element_count: 2,  size_in_byte: 8,  gl_setter_abbr: "2f",          gl_setter_uniform: "uniform2f",        gl_setter_attr: "vertexAttrib2f"  },
  "vec3":  { glsl_type: "vec3",  base_type: "FLOAT", element_size: 4, element_count: 3,  size_in_byte: 12, gl_setter_abbr: "3f",          gl_setter_uniform: "uniform3f",        gl_setter_attr: "vertexAttrib3f"  },
  "vec4":  { glsl_type: "vec4",  base_type: "FLOAT", element_size: 4, element_count: 4,  size_in_byte: 16, gl_setter_abbr: "4f",          gl_setter_uniform: "uniform4f",        gl_setter_attr: "vertexAttrib4f"  },
  "int":   { glsl_type: "int",   base_type: "INT",   element_size: 4, element_count: 1,  size_in_byte: 4,  gl_setter_abbr: null as never, gl_setter_uniform: "uniform4f",        gl_setter_attr: null as never     },
  "bool":  { glsl_type: "bool",  base_type: "BOOL",  element_size: 1, element_count: 1,  size_in_byte: 1,  gl_setter_abbr: null as never, gl_setter_uniform: "uniform4f",        gl_setter_attr: null as never     },
  "mat3":  { glsl_type: "mat3",  base_type: "FLOAT", element_size: 4, element_count: 9,  size_in_byte: 36, gl_setter_abbr: "3fv",         gl_setter_uniform: "uniformMatrix3fv", gl_setter_attr: "vertexAttrib3fv" },
  "mat4":  { glsl_type: "mat4",  base_type: "FLOAT", element_size: 4, element_count: 16, size_in_byte: 64, gl_setter_abbr: "4fv",         gl_setter_uniform: "uniformMatrix4fv", gl_setter_attr: "vertexAttrib4fv" },
} as const;

type KrGlslVarRecType = typeof TYPECONVERT;
type KrGlslVarType = keyof typeof TYPECONVERT;

export class KrGl<
  WebGlProgramVariable extends { [key: string]: KrGlslVarType }
> {
  /**
   * global enum to reference GLenum
   * @see https://registry.khronos.org/OpenGL/api/GL/glext.h **/
  static _gl: WebGL2RenderingContext;
  static _program: WebGLProgram;
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;

  static create<VS extends string, FS extends string>(opt: {
    canvas?: HTMLCanvasElement;
    vertext_shader: VS;
    fragment_shader: FS;
    opt?: WebGLContextAttributes;
  }): KrGl<RecordOfVariableTypeFromShaderString<VS | FS>> {
    return new KrGl(opt);
  }

  constructor(opt: {
    canvas?: HTMLCanvasElement;
    vertext_shader: string;
    fragment_shader: string;
    opt?: WebGLContextAttributes;
  }) {
    this.canvas = opt.canvas ?? document.createElement("canvas");
    const gl = this.canvas.getContext("webgl2", opt.opt ?? {})!;
    this.gl = gl;
    this.program = createProgram(
      gl,
      createShader(gl, gl.VERTEX_SHADER, opt.vertext_shader.trim())!,
      createShader(gl, gl.FRAGMENT_SHADER, opt.fragment_shader.trim())!
    )!;
    KrGl._gl = this.gl;
    KrGl._program = this.program;
    this.useprogram(); // auto use program
  }
  useprogram() {
    this.gl.useProgram(this.program);
    return this;
  }
  attribute_location<T extends keyof WebGlProgramVariable & string>(
    name: T,
    type: WebGlProgramVariable[T]
  ) {
    return new KrGlLocationAttribute(name, type);
  }
  uniform_location<T extends keyof WebGlProgramVariable & string>(
    name: T,
    type: WebGlProgramVariable[T]
  ) {
    return new KrGlLocationUniform(name, type);
  }
  create_vao_state() {
    return new KrGlVAO();
  }
  create_buffer<T extends KrGlBufferString>(type: T) {
    return new KrGlBuffer(type);
  }
}

interface KrGlBiding {
  bind(fn: () => void): this;
  _unsafe_bind_enable(): this;
  _unsafe_bind_disable(): this;
}

type KrGlBufferString =
  | "ARRAY_BUFFER"
  | "UNIFORM_BUFFER"
  | "ELEMENT_ARRAY_BUFFER";

export class KrGlBuffer<BUFFTYPE extends KrGlBufferString>
  implements KrGlBiding
{
  webgl_buffer: WebGLBuffer;
  buffer_type: BUFFTYPE;
  _data: TypedArray;
  static create<BUFFTYPE extends KrGlBufferString>(buffer_type: BUFFTYPE) {
    return new KrGlBuffer(buffer_type);
  }
  constructor(buffer_type: BUFFTYPE) {
    this.buffer_type = buffer_type;
    this.webgl_buffer = KrGl._gl.createBuffer()!;
    this._data = new Float32Array([]);
  }
  _unsafe_bind_enable(): this {
    KrGl._gl.bindBuffer(KrGl._gl[this.buffer_type], this.webgl_buffer);
    return this;
  }
  _unsafe_bind_disable(): this {
    KrGl._gl.bindBuffer(KrGl._gl[this.buffer_type], null);
    return this;
  }
  bind(fn: () => void): this {
    this._unsafe_bind_enable();
    fn();
    this._unsafe_bind_disable();
    return this;
  }
  data(inp: TypedArray) {
    this._data = inp;
    this.bind(() => {
      KrGl._gl.bufferData(
        KrGl._gl[this.buffer_type],
        inp,
        KrGl._gl.STATIC_DRAW
      );
    });
    return this;
  }
  update() {
    return this.data(this._data);
  }
}

class KrGlLocationBase<NAME extends string, TYPE extends KrGlslVarType> {
  constructor(public readonly name: NAME, public readonly type: TYPE) {}
}

class KrGlLocationAttribute<
  NAME extends string,
  TYPE extends KrGlslVarType
> extends KrGlLocationBase<NAME, TYPE> {
  readonly location: number;
  private flag: {
    enable_vert_attr_arr: boolean;
  };
  constructor(name: NAME, item_type: TYPE) {
    super(name, item_type);
    this.location = KrGl._gl.getAttribLocation(KrGl._program, name)! as any;
    this.flag = {
      enable_vert_attr_arr: false,
    };
    assert(this.location > -1);
  }
  enable_attr_array(): this {
    this.flag.enable_vert_attr_arr = true;
    KrGl._gl.enableVertexAttribArray(this.location);
    return this;
  }
  disable_attr_array(): this {
    this.flag.enable_vert_attr_arr = false;
    KrGl._gl.disableVertexAttribArray(this.location);
    return this;
  }
  set_attr_data_fallback<
    T extends KrGlslVarRecType[TYPE]["gl_setter_attr"] = KrGlslVarRecType[TYPE]["gl_setter_attr"]
  >(param: {
    data: Parameters<WebGL2RenderingContext[T]> extends [number, ...infer Rest]
      ? Rest
      : never;
  }): this {
    assert(
      !this.flag.enable_vert_attr_arr,
      "require enable_vert_attr_arr == false"
    );
    // @ts-ignore
    KrGl._gl[TYPECONVERT[this.type].gl_setter_attr](
      this.location,
      ...param.data
    );
    return this;
  }
  set_attr_to_active_array_buffer(
    opt: {
      strip?: number;
      offset?: number;
      normalized?: boolean;
    } = {}
  ): this {
    assert(
      this.flag.enable_vert_attr_arr,
      "require enable_vert_attr_arr == true"
    );
    KrGl._gl.vertexAttribPointer(
      this.location,
      TYPECONVERT[this.type].element_count,
      KrGl._gl[TYPECONVERT[this.type].base_type],
      opt.normalized ?? false,
      opt.strip ?? 0,
      opt.offset ?? 0
    );
    return this;
  }
  /* instance draw setup */
  vertex_attr_divisor(divide = 1): this {
    KrGl._gl.vertexAttribDivisor(this.location, divide);
    return this;
  }
}
class KrGlLocationUniform<
  NAME extends string,
  TYPE extends KrGlslVarType
> extends KrGlLocationBase<NAME, TYPE> {
  readonly location: WebGLUniformLocation;
  constructor(name: NAME, item_type: TYPE) {
    super(name, item_type);
    this.location = KrGl._gl.getUniformLocation(KrGl._program, name)!;
    assert(this.location);
  }
  set_uniform_data<
    T extends KrGlslVarRecType[TYPE]["gl_setter_uniform"] = KrGlslVarRecType[TYPE]["gl_setter_uniform"]
  >(param: {
    data: Parameters<WebGL2RenderingContext[T]> extends [
      WebGLUniformLocation | null,
      ...infer Rest
    ]
      ? Rest
      : never;
  }) {
    // @ts-ignore
    KrGl._gl[TYPECONVERT[this.type].gl_setter_uniform](
      this.location as any,
      ...param.data
    );
  }
}

/** snapshot of buffer state for multiple draw */
class KrGlVAO implements KrGlBiding {
  vao: WebGLVertexArrayObject;
  static create() {
    return new KrGlVAO();
  }
  constructor() {
    this.vao = KrGl._gl.createVertexArray()!;
    assert(this.vao);
  }
  _unsafe_bind_enable() {
    KrGl._gl.bindVertexArray(this.vao);
    return this;
  }
  _unsafe_bind_disable() {
    KrGl._gl.bindVertexArray(null);
    return this;
  }
  bind(fn: () => void) {
    this._unsafe_bind_enable();
    fn();
    this._unsafe_bind_disable();
    return this;
  }
}

function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) {
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

export function webgl_bind(
  opt: {
    vao?: KrGlVAO;
    array_buffer?: KrGlBuffer<"ARRAY_BUFFER">;
    element_array_buffer?: KrGlBuffer<"ELEMENT_ARRAY_BUFFER">;
  },
  fn: () => void
) {
  values(opt).forEach((o) => o._unsafe_bind_enable());
  fn();
  values(opt).forEach((o) => o._unsafe_bind_disable());
}
