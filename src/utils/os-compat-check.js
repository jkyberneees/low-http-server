const { worker } = require('cluster')
let threadId
try {
  threadId = require('worker_threads').threadId
} catch (err) {
  threadId = 0
}

if (require('os').platform !== 'linux' && ((worker && worker.id === 1) || threadId === 1)) {
  console.log('Be aware that uWebSockets.js clustering only works on Linux and depends on its kernel features. See <https://github.com/uNetworking/uWebSockets.js/issues/214#issuecomment-547589050> for more info') // https://github.com/uNetworking/uWebSockets.js/issues/214#issuecomment-547589050
}
