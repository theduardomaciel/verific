/** @typedef {import("prettier").Config} PrettierConfig */
/** @typedef {import("prettier-plugin-tailwindcss").PluginOptions} TailwindConfig */

/** @type { PrettierConfig } */
const config = {
    "tabWidth": 4,
    "useTabs": true,
    plugins: ["prettier-plugin-tailwindcss"],
}

export default config