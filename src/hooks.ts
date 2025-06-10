
import {browser} from "$app/environment"
import skio from 'sveltekit-io';
// import {connectSockets} from './lib/server/db/sockets';
// import {db} from '$lib/server/db';
// import { db } from '$lib/server/db'

skio.setup('http://192.168.68.69:3001', {
  cors: {
    origin: "*", // "http://localhost:5173",
    credentials: false, // true
  },
  maxHttpBufferSize: 1e8 // 100 MB
}).then((io: { on: (arg0: string, arg1: (socket: any) => void) => void; }) => {

  if ( browser )
    return
  console.log("Setting up server sockets...")
  import('./lib/server/sockets').then(({connectSockets}) => {
    connectSockets(io)
  })
})

export const handle = async ({ event, resolve }) => {

  if ( !browser )
    console.log("New request:", event.request.url)
    // skio.get()?.emit('message', {message: `New request: ${event.request.url}`} )

  return await resolve(event)
}