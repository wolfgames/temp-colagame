/* @refresh reload */
import { render } from "solid-js/web";
import App from "./app";

// Load game font in parallel with app mount (ready before any Pixi Text is created)
const gameFont = new FontFace('Baloo', "url('/assets/fonts/Baloo-Regular.woff2')");
gameFont.load().then((loaded) => document.fonts.add(loaded));

render(() => <App />, document.getElementById("app")!);
