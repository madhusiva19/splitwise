// Global stylesheets are imported for their side effects only (e.g. `import "./globals.css"` in
// layout.tsx). Next's own types only declare `*.module.css`, so newer TypeScript versions that
// check side-effect imports flag plain .css files without this.
declare module "*.css";
