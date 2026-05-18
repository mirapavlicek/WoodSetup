# Third-Party Notices

WoodSetup is distributed under the [PolyForm Noncommercial License 1.0.0](./LICENSE).
This file lists open-source libraries used by WoodSetup and their licenses.
Each library remains under its own license; the noncommercial restriction of
WoodSetup applies to the **assembled / distributed application as a whole**,
not to the underlying libraries.

For the full text of each upstream license, see the corresponding
`node_modules/<library>/LICENSE` after running `npm install`.

## Runtime dependencies

| Library                                                                              | License        |
| ------------------------------------------------------------------------------------ | -------------- |
| [react](https://github.com/facebook/react)                                           | MIT            |
| [react-dom](https://github.com/facebook/react)                                       | MIT            |
| [three](https://github.com/mrdoob/three.js)                                          | MIT            |
| [@react-three/fiber](https://github.com/pmndrs/react-three-fiber)                    | MIT            |
| [@react-three/drei](https://github.com/pmndrs/drei)                                  | MIT            |
| [zustand](https://github.com/pmndrs/zustand)                                         | MIT            |
| [uuid](https://github.com/uuidjs/uuid)                                               | MIT            |

## Build / dev dependencies

| Library                                                                              | License        |
| ------------------------------------------------------------------------------------ | -------------- |
| [vite](https://github.com/vitejs/vite)                                               | MIT            |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)                  | MIT            |
| [typescript](https://github.com/microsoft/TypeScript)                                | Apache-2.0     |
| [tailwindcss](https://github.com/tailwindlabs/tailwindcss)                           | MIT            |
| [postcss](https://github.com/postcss/postcss)                                        | MIT            |
| [autoprefixer](https://github.com/postcss/autoprefixer)                              | MIT            |
| [@types/react](https://www.npmjs.com/package/@types/react)                           | MIT            |
| [@types/react-dom](https://www.npmjs.com/package/@types/react-dom)                   | MIT            |
| [@types/three](https://www.npmjs.com/package/@types/three)                           | MIT            |
| [@types/uuid](https://www.npmjs.com/package/@types/uuid)                             | MIT            |

## Three.js example modules

WoodSetup imports `STLExporter` from `three/examples/jsm/exporters/STLExporter.js`,
which is shipped with the [three.js](https://github.com/mrdoob/three.js) package
and is also distributed under the **MIT License**.

---

If you redistribute WoodSetup, please keep this file together with `LICENSE`.
