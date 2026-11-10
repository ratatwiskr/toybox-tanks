declare module '*.css';

declare module '*?url' {
  const url: string;
  export default url;
}

// Replaced at build time by Vite's define. The test bridge is compiled out of
// production builds; a runtime query parameter cannot enable it.
declare const __TEST_BUILD__: boolean;
