import { Hono } from 'hono';
import {
  setRegionData,
  setRegionsList,
  setStateData,
  setStatesList,
} from './modules/ibge';

const app = new Hono();

app.get('/', (ctx) => {
  return ctx.text('Hello Hono!');
});

export default {
  fetch: app.fetch,

  async scheduled(_ctrl, env, _ctx) {
    try {
      const regions = await setRegionsList(env);

      for (const region of regions.data) await setRegionData(env, region.sigla);

      const states = await setStatesList(env);

      for (const state of states.data) {
        await setStateData(env, state.sigla);
        await env.QUEUE.send({
          key: 'uf',
          value: state.sigla,
        });
      }
    } catch (error) {
      console.log('error', error);
    }
  },

  async queue(batch, _env, _ctx) {
    for (const message of batch.messages) {
      const { key, value } = JSON.parse(message.body as string);

      switch (key) {
        case 'uf':
          console.log('uf', key, value);
          break;
      }
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;
