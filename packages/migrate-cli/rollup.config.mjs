import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve'; // 解析 node_modules 中的模块
import commonjs from '@rollup/plugin-commonjs';
import { builtinModules } from 'module';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
].filter(name => name !== "@transnail/migrate");

// console.info(external);

// process.exit(0);

const isProduction = process.env.NODE_ENV === 'production';

export default {
  input: {
    index: 'index.ts',
    // main: 'src/main.ts'
  },
  output: [
    {
      dir: 'dist',
      format: 'cjs',
      entryFileNames: '[name].cjs',
      sourcemap: !isProduction,
      // preserveModules: true,
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      // declaration: false,
      // declarationDir: undefined
    }),
    isProduction && terser({
      // 详细配置见下文
      compress: {
        drop_console: true, // 删除所有 console.* 函数调用
        drop_debugger: true, // 删除 debugger 语句
        pure_funcs: ['console.log'], // 移除指定的纯函数调用
      },
      format: {
        comments: false, // 删除注释
      },
      mangle: true, // 启用名称混淆（变量名缩短）
    }),
  ],
  external,
};
