// Plasmo's ambient types cover "*.module.css" but not plain global stylesheets.
// Declare them so side-effect imports like `import "@/style.gen.css"` type-check.
declare module "*.css";
