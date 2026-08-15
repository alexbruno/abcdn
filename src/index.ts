import { Hono } from 'hono';
import {
  setCitiesList,
  setCity,
  setGeoData,
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

      for (const state of states.data) await setStateData(env, state.sigla);
    } catch (error) {
      console.error('scheduled error', error);
    }
  },

  async queue(batch, env, _ctx) {
    for (const message of batch.messages) {
      try {
        const { key, value } = message.body as { key: string; value: string };

        switch (key) {
          case 'uf':
            await setGeoData(env, 'estados', value);
            await setCitiesList(env, value);
            break;

          case 'city':
            await setCity(env, value);
            break;

          default:
            console.log('No queue action for:', key, value);
        }
      } catch (error) {
        console.error('queue error', error);
      }
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;
