/**
 * ESLint config for client. root: true stops config search at client.
 * require.resolve(..., { paths: [appNodeModules] }) forces resolution from
 * client/node_modules only, avoiding conflict with root node_modules.
 */
const path = require('path');

const appNodeModules = path.join(__dirname, 'node_modules');

module.exports = {
  root: true,
  extends: [
    require.resolve('eslint-config-react-app', { paths: [appNodeModules] }),
    require.resolve('eslint-config-react-app/jest', { paths: [appNodeModules] }),
  ],
};
