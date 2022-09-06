import { defineConfig } from "vite";
import { glslify } from 'vite-plugin-glslify'
console.log(glslify)
export default defineConfig({
  plugins: [
    glslify()
  ]
})