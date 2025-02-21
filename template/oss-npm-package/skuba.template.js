/**
 * Run `skuba configure` to finish templating and remove this file.
 */

module.exports = {
  entryPoint: 'src/index.ts',
  fields: [
    {
      name: 'moduleName',
      message: 'Module name',
      initial: 'my-first-module',
    },
    {
      name: 'description',
      message: 'Description',
      initial: 'This is my first module',
    },
  ],
  // `moduleName` is required for a valid `package.json`
  noSkip: true,
  type: 'package',
};
